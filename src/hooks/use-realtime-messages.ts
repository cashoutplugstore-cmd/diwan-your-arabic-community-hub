import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "@/types";

type Handlers = {
  onInsert?: (message: Message) => void;
  onChange?: (message: Message) => void;
};

/**
 * Subscribes to realtime message changes for a room.
 * The channel is removed on unmount / room change so subscriptions never leak.
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
        (payload) => handlersRef.current.onInsert?.(payload.new as Message),
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
