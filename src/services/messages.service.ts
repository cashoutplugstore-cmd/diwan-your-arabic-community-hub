import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MessageWithAuthor, Profile } from "@/types";

export const MESSAGE_PAGE_SIZE = 40;
export const MAX_MESSAGE_LENGTH = 2000;
type AIReplyHandler = (reply: MessageWithAuthor) => void;

export async function fetchMessagePage(roomId: string, before?: string | null): Promise<MessageWithAuthor[]> {
  let query = supabase.from("messages").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  const realRows = error ? [] : (data ?? []).slice().reverse();
  const authorIds = [...new Set(realRows.map((m) => m.user_id))];
  const { data: profiles } = authorIds.length ? await supabase.from("profiles").select("*").in("id", authorIds) : { data: [] as Profile[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  if (!before) {
    const { data: session } = await supabase.auth.getSession();
    if (session.session?.user?.id) {
      const { data: room } = await supabase.from("rooms").select("is_private").eq("id", roomId).maybeSingle();
      if (room?.is_private === true) void (supabase as any).rpc("mark_private_chat_read", { _room_id: roomId });
    }
  }

  return realRows.map((m) => ({ ...m, author: byId.get(m.user_id) ?? null, is_deleted: Boolean(m.is_deleted) }));
}

/**
 * AI orchestration is server-owned. The browser only submits the source
 * message id; the Edge Function performs authorization, idempotency and
 * context selection. This prevents multiple tabs from creating bot replies.
 */
export async function triggerAIRoomReplies(input: { roomId: string; messageId: string; message?: string; createdAt?: string; onReply?: AIReplyHandler }) {
  if (!input.messageId) return;
  const { data, error } = await supabase.functions.invoke("diwan-ai-room-v2", {
    body: { roomId: input.roomId, sourceMessageId: input.messageId },
  });
  if (error || !data?.message || !input.onReply) return;
  input.onReply(data.message as MessageWithAuthor);
}

export async function sendMessage(input: { roomId: string; userId: string; content: string; replyToId?: string | null; onAIReply?: AIReplyHandler }) {
  const content = input.content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!content) throw new Error("empty");
  const clientCreatedAt = new Date().toISOString();
  const { data: room, error: roomError } = await supabase.from("rooms").select("is_private").eq("id", input.roomId).maybeSingle();
  if (roomError) throw roomError;
  const { data, error } = await supabase.from("messages").insert({ room_id: input.roomId, user_id: input.userId, content, reply_to_id: input.replyToId ?? null }).select("id,created_at").single();
  if (error) throw error;
  if (typeof window !== "undefined") window.localStorage.setItem(`diwan:last-real-message:${input.roomId}`, String(Date.now()));
  if (room?.is_private === true || !data?.id) return;
  if (input.onAIReply) {
    void triggerAIRoomReplies({ roomId: input.roomId, messageId: data.id, message: content, createdAt: data.created_at ?? clientCreatedAt, onReply: input.onAIReply });
  }
}

export async function editMessage(id: string, content: string) { const { error } = await supabase.from("messages").update({ content: content.trim().slice(0, MAX_MESSAGE_LENGTH), edited_at: new Date().toISOString() }).eq("id", id); if (error) throw error; }
export async function deleteMessage(id: string) { const { error } = await supabase.from("messages").update({ is_deleted: true }).eq("id", id); if (error) throw error; }
export const messagesQuery = (roomId: string | undefined) => queryOptions({ queryKey: ["messages", roomId], queryFn: () => fetchMessagePage(roomId!), enabled: Boolean(roomId) });
