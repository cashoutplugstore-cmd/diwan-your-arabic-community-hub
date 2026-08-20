import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Room, Profile } from "@/types";

export type PrivateChat = Room & { other_user: Profile | null; last_message_at: string | null; unread_count: number };

type UnreadRow = { room_id: string; unread_count: number | string };

export async function fetchMyPrivateChats(userId: string): Promise<PrivateChat[]> {
  // RLS already limits private rooms to their owner or members. Query private rooms
  // directly so a DM does not disappear just because one side missed a membership row.
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("*")
    .eq("is_private", true)
    .order("created_at", { ascending: false });
  if (roomsError) throw roomsError;
  if (!rooms?.length) return [];

  const ids = rooms.map((room) => room.id);
  const [{ data: members, error: membersError }, { data: messages, error: messagesError }, { data: unreadRows, error: unreadError }] = await Promise.all([
    supabase.from("room_members").select("room_id,user_id").in("room_id", ids),
    supabase.from("messages").select("room_id,created_at").in("room_id", ids).eq("is_deleted", false),
    (supabase as any).rpc("private_chat_unread_counts") as Promise<{ data: UnreadRow[] | null; error: any }>,
  ]);
  if (membersError) throw membersError;
  if (messagesError) throw messagesError;
  if (unreadError) throw unreadError;

  const otherIds = new Set<string>();
  for (const row of members ?? []) if (row.user_id && row.user_id !== userId) otherIds.add(row.user_id);
  for (const room of rooms) if (room.owner_id && room.owner_id !== userId) otherIds.add(room.owner_id);

  const { data: profiles, error: profilesError } = otherIds.size
    ? await supabase.from("profiles").select("*").in("id", [...otherIds])
    : { data: [], error: null };
  if (profilesError) throw profilesError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const memberByRoom = new Map<string, string>();
  for (const row of members ?? []) {
    if (row.room_id && row.user_id && row.user_id !== userId && !memberByRoom.has(row.room_id)) memberByRoom.set(row.room_id, row.user_id);
  }
  for (const room of rooms) {
    if (!memberByRoom.has(room.id) && room.owner_id && room.owner_id !== userId) memberByRoom.set(room.id, room.owner_id);
  }

  const lastByRoom = new Map<string, string>();
  for (const row of messages ?? []) {
    if (!row.room_id || !row.created_at) continue;
    const current = lastByRoom.get(row.room_id);
    if (!current || new Date(row.created_at).getTime() > new Date(current).getTime()) lastByRoom.set(row.room_id, row.created_at);
  }
  const unreadByRoom = new Map((unreadRows ?? []).map((row) => [row.room_id, Number(row.unread_count) || 0]));

  return rooms.map((room) => ({
    ...(room as Room),
    other_user: profileById.get(memberByRoom.get(room.id) ?? "") ?? null,
    last_message_at: lastByRoom.get(room.id) ?? null,
    unread_count: unreadByRoom.get(room.id) ?? 0,
  }));
}

export const myPrivateChatsQuery = (userId: string | undefined) => queryOptions({
  queryKey: ["private-chats", userId],
  queryFn: () => fetchMyPrivateChats(userId!),
  enabled: Boolean(userId),
  staleTime: 3_000,
  refetchInterval: 5_000,
});

export const myPrivateChatUnreadCountQuery = (userId: string | undefined) => queryOptions({
  queryKey: ["private-chat-unread-count", userId],
  queryFn: async () => {
    const { data, error } = await (supabase as any).rpc("private_chat_unread_counts") as { data: UnreadRow[] | null; error: any };
    if (error) throw error;
    return (data ?? []).reduce((sum, row) => sum + (Number(row.unread_count) || 0), 0);
  },
  enabled: Boolean(userId),
  staleTime: 3_000,
  refetchInterval: 5_000,
});

export async function markPrivateChatRead(roomId: string) {
  const { error } = await (supabase as any).rpc("mark_private_chat_read", { _room_id: roomId });
  if (error) throw error;
}
