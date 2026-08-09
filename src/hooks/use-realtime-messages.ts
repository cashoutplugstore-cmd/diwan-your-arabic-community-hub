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
 *
 * Own INSERT events are ignored because the chat page already adds an
 * optimistic copy and invalidates the query after the send succeeds. This
 * prevents the Realtime echo from rendering the same message twice.
 */
export function useRealtimeMessages(roomId: string | undefined, handlers: Handlers = {}) {
  const queryClient = useQueryClient();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!roomId) return;
    let disposed = false;
    let ambientTimer: number | undefined;
    let currentUserId: string | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (!disposed) currentUserId = data.user?.id ?? null;
    });

    const emitAmbient = () => {
      if (disposed || document.visibilityState !== "visible") return;
      const message = buildDemoAmbientMessage(roomId);
      if (message) handlersRef.current.onInsert?.(message as Message);
      ambientTimer = window.setTimeout(emitAmbient, 12_000 + Math.floor(Math.random() * 24_000));
    };

    ambientTimer = window.setTimeout(emitAmbient, 8_000 + Math.floor(Math.random() * 12_000));

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const message = payload.new as Message;

          // Do not append our own Realtime echo. The optimistic row is replaced
          // by the normal React Query invalidation in the send mutation.
          if (currentUserId && message.user_id === currentUserId) return;

          handlersRef.current.onInsert?.(message);

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
