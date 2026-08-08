import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildDemoReply } from "@/lib/demo-activity";
import type { Message } from "@/types";

type Handlers = {
  onInsert?: (message: Message) => void;
  onChange?: (message: Message) => void;
};

/**
 * Realtime room messages plus a clearly synthetic, UI-only activity layer.
 * Synthetic replies are never inserted into the database.
 */
export function useRealtimeMessages(roomId: string | undefined, handlers: Handlers = {}) {
  const queryClient = useQueryClient();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!roomId) return;
    let selfUserId: string | undefined;
    let disposed = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!disposed) selfUserId = data.user?.id;
    });

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const message = payload.new as Message;
          handlersRef.current.onInsert?.(message);

          // If the authenticated user is the one who just spoke, add one delayed
          // synthetic welcome/reply in the UI. This does not touch Supabase.
          if (selfUserId && message.user_id === selfUserId) {
            const demoReply = buildDemoReply(roomId, message.content);
            if (demoReply) {
              window.setTimeout(() => {
                if (!disposed) handlersRef.current.onInsert?.(demoReply);
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
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);
}
