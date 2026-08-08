import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildDemoReply, buildDemoAmbientMessage } from "@/lib/demo-activity";
import type { Message } from "@/types";

type Handlers = {
  onInsert?: (message: Message) => void;
  onChange?: (message: Message) => void;
};

/**
 * Realtime room messages plus a lightweight, clearly synthetic UI activity layer.
 * Synthetic activity is never inserted into Supabase and is throttled for mobile performance.
 */
export function useRealtimeMessages(roomId: string | undefined, handlers: Handlers = {}) {
  const queryClient = useQueryClient();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!roomId) return;
    let selfUserId: string | undefined;
    let disposed = false;
    let ambientTimer: number | undefined;

    void supabase.auth.getUser().then(({ data }) => {
      if (!disposed) selfUserId = data.user?.id;
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
          handlersRef.current.onInsert?.(message);

          if (selfUserId && message.user_id === selfUserId) {
            const demoReply = buildDemoReply(roomId, message.content);
            if (demoReply) {
              window.setTimeout(() => {
                if (!disposed) handlersRef.current.onInsert?.(demoReply as Message);
              }, 1200);
            }
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
