import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MessageWithAuthor } from "@/types";

export async function fetchMessages(roomId: string): Promise<MessageWithAuthor[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  const rows = data ?? [];
  const authorIds = [...new Set(rows.map((m) => m.user_id))];
  if (authorIds.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", authorIds);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((m) => ({ ...m, author: byId.get(m.user_id) ?? null }));
}

export async function sendMessage(input: { roomId: string; userId: string; content: string }) {
  const { error } = await supabase.from("messages").insert({
    room_id: input.roomId,
    user_id: input.userId,
    content: input.content.trim(),
  });
  if (error) throw error;
}

export const messagesQuery = (roomId: string | undefined) =>
  queryOptions({
    queryKey: ["messages", roomId],
    queryFn: () => fetchMessages(roomId!),
    enabled: Boolean(roomId),
  });