import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildDemoAmbientMessage } from "@/lib/demo-activity";
import type { Message } from "@/types";

type Handlers = {
  onInsert?: (message: Message) => void;
  onChange?: (message: Message) => void;
};

/**
 * Realtime room messages plus a lightweight synthetic UI activity layer.
 * Synthetic activity is never inserted into Supabase.
 *
 * AI replies are scheduled by sendMessage for messages created by the
 * current user. Realtime only delivers the persisted message to other
 * clients, so it must never schedule AI replies itself; doing both caused
 * duplicate AI conversations.
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

          // The sender already has an optimistic row and invalidates its
          // query after success. Ignore the own Realtime echo to avoid a
          // second visual insert.
          if (currentUserId && message.user_id === currentUserId) return;

          handlersRef.current.onInsert?.(message);
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
        () => void queryClient.invalidateQueries({ queryKey: ["messages", roomId] }),
      )
      .subscribe();

    return () => {
      disposed = true;
      if (ambientTimer) window.clearTimeout(ambientTimer);
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);
}
