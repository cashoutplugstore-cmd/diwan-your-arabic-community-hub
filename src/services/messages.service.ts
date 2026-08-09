import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { looseDb } from "@/integrations/supabase/loose-db";
import { DEMO_MESSAGES, DEMO_PROFILES } from "@/lib/demo-community";
import type { MessageWithAuthor, Profile } from "@/types";

export const MESSAGE_PAGE_SIZE = 40;
export const MAX_MESSAGE_LENGTH = 2000;

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
  const realRows = error ? [] : (data ?? []).slice().reverse();
  const authorIds = [...new Set(realRows.map((m) => m.user_id))];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("*").in("id", authorIds)
    : { data: [] as Profile[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const hydratedReal: MessageWithAuthor[] = realRows.map((m) => ({
    ...m,
    author: byId.get(m.user_id) ?? null,
    is_deleted: Boolean(m.is_deleted),
  }));

  if (!before) {
    const { data: demoRows } = await looseDb
      .from("demo_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(MESSAGE_PAGE_SIZE);

    let demo: MessageWithAuthor[] = [];
    if (demoRows?.length) {
      const demoUserIds = [...new Set(demoRows.map((m: any) => m.demo_user_id))];
      const { data: demoProfiles } = await looseDb
        .from("demo_members")
        .select("*")
        .in("id", demoUserIds);
      const demoById = new Map<string, Profile>((demoProfiles ?? []).map((p: Profile) => [p.id, p]));
      demo = demoRows.map((m: any) => ({
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

function aiAuthorFor(roomId: string) {
  const hash = [...roomId].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  return DEMO_PROFILES[hash % DEMO_PROFILES.length]!;
}

async function queueAIRoomReply(roomId: string, message: string) {
  try {
    const { data, error } = await supabase.functions.invoke("diwan-ai-room", {
      body: { roomId, roomName: roomId, message, language: "ar" },
    });
    if (error || !data?.text) return;

    const author = aiAuthorFor(roomId);
    const createdAt = new Date(Date.now() + 1600).toISOString();
    await looseDb.from("demo_messages").insert({
      room_id: roomId,
      demo_user_id: author.id,
      content: data.text,
      created_at: createdAt,
    });
  } catch {
    // AI is an enhancement; never make a real member's message fail because AI is unavailable.
  }
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

  if (typeof window !== "undefined") {
    window.localStorage.setItem(`diwan:last-real-message:${input.roomId}`, String(Date.now()));
  }

  // AI reply runs after the real message succeeds. It is never allowed to block
  // or fail the real chat message.
  void queueAIRoomReply(input.roomId, content);
}

export async function editMessage(id: string, content: string) {
  const { error } = await supabase
    .from("messages")
    .update({ content: content.trim().slice(0, MAX_MESSAGE_LENGTH), edited_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMessage(id: string) {
  const { error } = await supabase
    .from("messages")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw error;
}

export const messagesQuery = (roomId: string | undefined) =>
  queryOptions({
    queryKey: ["messages", roomId],
    queryFn: () => fetchMessagePage(roomId!),
    enabled: Boolean(roomId),
  });
