import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_PROFILES } from "@/lib/demo-community";
import type { MessageWithAuthor, Profile } from "@/types";

export const MESSAGE_PAGE_SIZE = 40;
export const MAX_MESSAGE_LENGTH = 2000;

/** Only real database messages are loaded as conversation history. */
export async function fetchMessagePage(roomId: string, before?: string | null): Promise<MessageWithAuthor[]> {
  let query = supabase.from("messages").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  const realRows = error ? [] : (data ?? []).slice().reverse();
  const authorIds = [...new Set(realRows.map((m) => m.user_id))];
  const { data: profiles } = authorIds.length ? await supabase.from("profiles").select("*").in("id", authorIds) : { data: [] as Profile[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return realRows.map((m) => ({ ...m, author: byId.get(m.user_id) ?? null, is_deleted: Boolean(m.is_deleted) }));
}

function aiAuthorFor(roomId: string) {
  const hash = [...roomId].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  return DEMO_PROFILES[hash % DEMO_PROFILES.length]!;
}

async function queueAIRoomReply(roomId: string, message: string) {
  try {
    const { data, error } = await supabase.functions.invoke("diwan-ai-room", { body: { roomId, roomName: roomId, message, language: "ar" } });
    if (error || !data?.text) return;
    // AI replies use the same real messages table, so ordering is handled by the
    // database timestamp and realtime subscription. They can never precede the
    // member message that triggered them.
    await supabase.from("messages").insert({ room_id: roomId, user_id: aiAuthorFor(roomId).id, content: data.text, reply_to_id: null });
  } catch {
    // AI is optional; never fail the real member's send because AI is unavailable.
  }
}

export async function sendMessage(input: { roomId: string; userId: string; content: string; replyToId?: string | null }) {
  const content = input.content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!content) throw new Error("empty");
  const { error } = await supabase.from("messages").insert({ room_id: input.roomId, user_id: input.userId, content, reply_to_id: input.replyToId ?? null });
  if (error) throw error;
  if (typeof window !== "undefined") window.localStorage.setItem(`diwan:last-real-message:${input.roomId}`, String(Date.now()));
  // Trigger only after the real message has successfully reached Supabase.
  void queueAIRoomReply(input.roomId, content);
}

export async function editMessage(id: string, content: string) {
  const { error } = await supabase.from("messages").update({ content: content.trim().slice(0, MAX_MESSAGE_LENGTH), edited_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteMessage(id: string) {
  const { error } = await supabase.from("messages").update({ is_deleted: true }).eq("id", id);
  if (error) throw error;
}

export const messagesQuery = (roomId: string | undefined) => queryOptions({ queryKey: ["messages", roomId], queryFn: () => fetchMessagePage(roomId!), enabled: Boolean(roomId) });
