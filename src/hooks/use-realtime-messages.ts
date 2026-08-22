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

          // Reconcile the server INSERT with the optimistic message instead of
          // ignoring our own realtime event. The optimistic id is local-only,
          // so match by author/content within a short time window and replace it
          // with the canonical database row. This prevents duplicate bubbles.
          if (currentUserId && message.user_id === currentUserId) {
            const now = new Date(message.created_at).getTime();
            let reconciled = false;
            queryClient.setQueryData<any>(["messages", roomId], (prev: any) => {
              if (!prev?.pages) return prev;
              const pages = prev.pages.map((page: any[]) => page.map((item) => {
                const itemTime = new Date(item.created_at).getTime();
                const isOptimistic = String(item.id).startsWith("optimistic-");
                const sameContent = item.user_id === message.user_id && item.content === message.content;
                const closeEnough = Math.abs(now - itemTime) <= 15000;
                if (isOptimistic && sameContent && closeEnough) {
                  reconciled = true;
                  return { ...message, author: item.author ?? null };
                }
                return item;
              }));
              return { ...prev, pages };
            });
            if (reconciled) return;
          }

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
