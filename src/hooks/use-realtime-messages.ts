import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildDemoAmbientMessage } from "@/lib/demo-activity";
import { getDailyDemoProfiles } from "@/lib/demo-community";
import type { Message, Profile } from "@/types";

type Handlers = {
  onInsert?: (message: Message) => void;
  onChange?: (message: Message) => void;
};

type AiDemoBroadcast = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  reply_to_id: string | null;
  edited_at: string | null;
  is_deleted: boolean;
  author: Profile;
};

/**
 * Realtime room messages plus clearly synthetic AI/demo activity.
 * AI replies are generated server-side and broadcast to every connected client;
 * they are intentionally not written as fake human rows in the messages table.
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
      ambientTimer = window.setTimeout(emitAmbient, 18_000 + Math.floor(Math.random() * 30_000));
    };

    ambientTimer = window.setTimeout(emitAmbient, 10_000 + Math.floor(Math.random() * 15_000));

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "broadcast",
        { event: "ai-demo-message" },
        (event) => {
          const payload = event.payload as Partial<AiDemoBroadcast> | undefined;
          if (
            !payload?.id ||
            payload.room_id !== roomId ||
            !payload.user_id ||
            !payload.content ||
            !payload.author
          ) return;

          // Hydrate the synthetic member locally so the existing ChatPage renderer
          // can display the author without requiring a database profile row.
          const demoMember = { ...payload.author, room_role: "member" };
          queryClient.setQueryData<Profile[]>(["room_members", "profiles", roomId], (current) => {
            if (!current) return current;
            if (current.some((member) => member.id === demoMember.id)) return current;
            return [...current, demoMember];
          });

          handlersRef.current.onInsert?.({
            id: payload.id,
            room_id: payload.room_id,
            user_id: payload.user_id,
            content: payload.content,
            created_at: payload.created_at ?? new Date().toISOString(),
            reply_to_id: payload.reply_to_id ?? null,
            edited_at: payload.edited_at ?? null,
            is_deleted: payload.is_deleted ?? false,
          } as Message);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const message = payload.new as Message;
          handlersRef.current.onInsert?.(message);

          // One server-side AI generation is requested per real user message.
          // The endpoint deduplicates concurrent requests and broadcasts the result
          // to all room clients, so individual browsers never call OpenAI directly.
          void fetch("/api/ai-demo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageId: message.id,
              roomId,
              content: message.content,
              roomTopic: roomId,
            }),
          }).catch(() => {
            // AI activity is optional; a failed generation must never break chat.
          });
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
