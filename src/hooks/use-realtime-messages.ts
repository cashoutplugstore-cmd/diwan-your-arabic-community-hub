import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildDemoAmbientMessage } from "@/lib/demo-activity";
import { triggerAIRoomReplies } from "@/services/messages.service";
import type { Message } from "@/types";

type Handlers = {
  onInsert?: (message: Message) => void;
  onChange?: (message: Message) => void;
};

/**
 * Realtime room messages plus a lightweight synthetic UI activity layer.
 * Synthetic activity is never inserted into Supabase.
 */
export function useRealtimeMessages(roomId: string | undefined, handlers: Handlers = {}) {
  const queryClient = useQueryClient();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!roomId) return;
    let disposed = false;
    let ambientTimer: number | undefined;

    const emitAmbient = () => {
      if (disposed || document.visibilityState !== "visible") return;
      const message = buildDemoAmbientMessage(roomId);
      if (message) handlersRef.current.onInsert?.(message as Message);
      // Natural gaps: activity is intermittent, not a message every second.
      ambientTimer = window.setTimeout(emitAmbient, 12_000 + Math.floor(Math.random() * 24_000));
    };

    // Give a fresh room a moment before its first synthetic activity.
    ambientTimer = window.setTimeout(emitAmbient, 8_000 + Math.floor(Math.random() * 12_000));

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const message = payload.new as Message;
          handlersRef.current.onInsert?.(message);

          // Every real member message can naturally trigger the community AI.
          // triggerAIRoomReplies deduplicates by message id, so the local send
          // path and this realtime path cannot schedule the same reaction twice.
          if (!String(message.user_id).startsWith("demo-")) {
            triggerAIRoomReplies({
              roomId,
              messageId: message.id,
              message: message.content,
              createdAt: message.created_at,
              onReply: (reply) => handlersRef.current.onInsert?.(reply as Message),
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => handlersRef.current.onChange?.(payload.new as Message),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", roomId] }),
      )
      .subscribe();

    return () => {
      disposed = true;
      if (ambientTimer) window.clearTimeout(ambientTimer);
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);
}
