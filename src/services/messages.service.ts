import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MESSAGES } from "@/lib/demo-community";
import type { MessageWithAuthor, Profile } from "@/types";

export const MESSAGE_PAGE_SIZE = 40;
export const MAX_MESSAGE_LENGTH = 2000;

/**
 * Loads real messages plus the seeded public demo feed used by Diwan's community rooms.
 * Demo activity is read-only and is never written to the real messages table.
 */
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

  // A room can be publicly visible while the authenticated messages policy
  // still filters real messages. Never let that policy failure hide the demo feed.
  const { data, error } = await query;
  const realRows = error ? [] : (data ?? []).slice().reverse();

  const authorIds = [...new Set(realRows.map((m) => m.user_id))];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("*").in("id", authorIds)
    : { data: [] as Profile[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const hydratedReal: MessageWithAuthor[] = realRows.map((m) => ({
    ...m,
    author: byId.get(m.user_id) ?? null,
    is_deleted: Boolean(m.deleted_at),
  }));

  if (!before) {
    // Prefer the seeded database demo feed so every room gets its persisted
    // activity. Fall back to the deterministic local generator if unavailable.
    const { data: demoRows } = await supabase
      .from("demo_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(MESSAGE_PAGE_SIZE);

    let demo: MessageWithAuthor[] = [];
    if (demoRows?.length) {
      const demoUserIds = [...new Set(demoRows.map((m) => m.demo_user_id))];
      const { data: demoProfiles } = await supabase
        .from("demo_members")
        .select("*")
        .in("id", demoUserIds);
      const demoById = new Map((demoProfiles ?? []).map((p) => [p.id, p]));
      demo = demoRows.map((m) => ({
        id: m.id,
        room_id: m.room_id,
        user_id: m.demo_user_id,
        content: m.content,
        created_at: m.created_at,
        reply_to_id: null,
        edited_at: null,
        is_deleted: false,
        author: demoById.get(m.demo_user_id) ?? null,
      }));
    }

    if (!demo.length) demo = DEMO_MESSAGES(roomId);

    return [...demo, ...hydratedReal].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  return hydratedReal;
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

/** Soft delete maps to the database's deleted_at column. */
export async function deleteMessage(id: string) {
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export const messagesQuery = (roomId: string | undefined) =>
  queryOptions({
    queryKey: ["messages", roomId],
    queryFn: () => fetchMessagePage(roomId!),
    enabled: Boolean(roomId),
  });
