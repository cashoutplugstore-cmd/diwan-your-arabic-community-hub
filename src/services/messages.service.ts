import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MESSAGES } from "@/lib/demo-community";
import type { MessageWithAuthor } from "@/types";

export const MESSAGE_PAGE_SIZE = 40;
export const MAX_MESSAGE_LENGTH = 2000;

/** Loads a page of messages and hydrates authors. Fresh installations also receive a clearly synthetic demo feed. */
export async function fetchMessagePage(
  roomId: string,
  before?: string | null,
): Promise<MessageWithAuthor[]> {
  let query = supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).slice().reverse();

  const authorIds = [...new Set(rows.map((m) => m.user_id))];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("*").in("id", authorIds)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const hydrated = rows.map((m) => ({ ...m, author: byId.get(m.user_id) ?? null }));

  // Demo activity is intentionally local to the UI layer and is never written to Supabase.
  // Only inject it on the newest page so normal pagination remains unchanged.
  if (!before) {
    const demo = DEMO_MESSAGES(roomId);
    return [...demo, ...hydrated].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  return hydrated;
}

export async function sendMessage(input: {
  roomId: string;
  userId: string;
  content: string;
  replyToId?: string | null;
}) {
  const content = input.content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!content) throw new Error("empty");
  const { error } = await supabase.from("messages").insert({
    room_id: input.roomId,
    user_id: input.userId,
    content,
    reply_to_id: input.replyToId ?? null,
  });
  if (error) throw error;
}

export async function editMessage(id: string, content: string) {
  const { error } = await supabase
    .from("messages")
    .update({ content: content.trim().slice(0, MAX_MESSAGE_LENGTH), edited_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Soft delete keeps thread structure intact for replies. */
export async function deleteMessage(id: string) {
  const { error } = await supabase
    .from("messages")
    .update({ is_deleted: true, content: "" })
    .eq("id", id);
  if (error) throw error;
}

export const messagesQuery = (roomId: string | undefined) =>
  queryOptions({
    queryKey: ["messages", roomId],
    queryFn: () => fetchMessagePage(roomId!),
    enabled: Boolean(roomId),
  });
