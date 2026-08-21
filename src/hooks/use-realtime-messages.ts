import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildDemoAmbientMessage, buildDemoEntryMessages } from "@/lib/demo-activity";
import type { Message } from "@/types";

type Handlers = { onInsert?: (message: Message) => void; onChange?: (message: Message) => void };

export function useRealtimeMessages(roomId: string | undefined, handlers: Handlers = {}) {
  const queryClient = useQueryClient();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  useEffect(() => {
    if (!roomId) return;
    let disposed = false;
    let ambientTimer: number | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const start = async () => {
      const [{ data: authData }, { data: room }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("rooms").select("is_private").eq("id", roomId).maybeSingle(),
      ]);
      if (disposed) return;
      const currentUserId = authData.user?.id ?? null;
      const isPrivateRoom = room?.is_private === true;

      // Demo/AI ambient activity belongs only to public community rooms.
      if (!isPrivateRoom) {
        for (const message of buildDemoEntryMessages(roomId)) {
          if (disposed) break;
          window.setTimeout(
            () => {
              if (!disposed) handlersRef.current.onInsert?.(message as Message);
            },
            Math.max(0, new Date(message.created_at).getTime() - Date.now()),
          );
        }
        const emitAmbient = () => {
          if (disposed || document.visibilityState !== "visible") return;
          const message = buildDemoAmbientMessage(roomId);
          if (message) handlersRef.current.onInsert?.(message as Message);
          ambientTimer = window.setTimeout(emitAmbient, 8_000 + Math.floor(Math.random() * 14_000));
        };
        ambientTimer = window.setTimeout(emitAmbient, 7_000 + Math.floor(Math.random() * 8_000));
      }

      channel = supabase
        .channel(`room-messages-${roomId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
          (payload) => {
            const message = payload.new as Message;
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
    };
    void start();
    return () => {
      disposed = true;
      if (ambientTimer) window.clearTimeout(ambientTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);
}
