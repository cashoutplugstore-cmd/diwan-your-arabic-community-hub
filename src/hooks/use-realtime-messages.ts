import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildDemoReply } from "@/lib/demo-activity";
import type { Message } from "@/types";

type Handlers = {
  onInsert?: (message: Message) => void;
  onChange?: (message: Message) => void;
  /** Current authenticated user id; demo replies are never generated for demo messages. */
  selfUserId?: string;
  /** Enables UI-only synthetic replies to real messages in quiet rooms. */
  demoReplies?: boolean;
};

/**
 * Subscribes to realtime message changes for a room.
 * Demo replies are UI-only and are never persisted to Supabase.
 */
export function useRealtimeMessages(roomId: string | undefined, handlers: Handlers = {}) {
  const queryClient = useQueryClient();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const message = payload.new as Message;
          handlersRef.current.onInsert?.(message);

          const { selfUserId, demoReplies } = handlersRef.current;
          if (demoReplies && selfUserId && message.user_id === selfUserId) {
            const demoReply = buildDemoReply(roomId, message.content);
            if (demoReply) {
              window.setTimeout(() => handlersRef.current.onInsert?.(demoReply), 1200);
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
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);
}
