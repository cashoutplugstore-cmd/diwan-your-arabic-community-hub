import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "@/types";

type Handlers = { onInsert?: (message: Message) => void; onChange?: (message: Message) => void };

export function useRealtimeMessages(roomId: string | undefined, handlers: Handlers = {}) {
  const queryClient = useQueryClient();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!roomId) return;
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const start = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (disposed) return;
      const currentUserId = authData.user?.id ?? null;

      channel = supabase
        .channel(`room-messages-${roomId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, (payload) => {
          const message = payload.new as Message;
          if (currentUserId && message.user_id === currentUserId) return;
          handlersRef.current.onInsert?.(message);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, (payload) => {
          handlersRef.current.onChange?.(payload.new as Message);
        })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, () => {
          void queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
        })
        .subscribe();
    };

    void start();
    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);
}
