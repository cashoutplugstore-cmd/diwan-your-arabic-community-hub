import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Room, Profile } from "@/types";

export type PrivateChat = Room & { other_user: Profile | null; last_message_at: string | null };

export async function fetchMyPrivateChats(userId: string): Promise<PrivateChat[]> {
  // A direct-room creator is the room owner and may not have their own
  // room_members row. Collect both memberships and owned rooms.
  const [{ data: memberships, error: membershipError }, { data: ownedRooms, error: ownedError }] = await Promise.all([
    supabase.from("room_members").select("room_id").eq("user_id", userId),
    supabase.from("rooms").select("*").eq("owner_id", userId).eq("is_private", true),
  ]);
  if (membershipError) throw membershipError;
  if (ownedError) throw ownedError;

  const roomIds = new Set<string>();
  for (const row of memberships ?? []) if (row.room_id) roomIds.add(row.room_id);
  for (const room of ownedRooms ?? []) if (room.id) roomIds.add(room.id);
  if (!roomIds.size) return [];

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("*")
    .in("id", [...roomIds])
    .eq("is_private", true)
    .order("created_at", { ascending: false });
  if (roomsError) throw roomsError;
  if (!rooms?.length) return [];

  const ids = rooms.map((room) => room.id);
  const [{ data: members, error: membersError }, { data: messages, error: messagesError }] = await Promise.all([
    supabase.from("room_members").select("room_id,user_id").in("room_id", ids),
    supabase.from("messages").select("room_id,created_at").in("room_id", ids).eq("is_deleted", false),
  ]);
  if (membersError) throw membersError;
  if (messagesError) throw messagesError;

  const otherIds = [...new Set((members ?? []).filter((row) => row.user_id !== userId).map((row) => row.user_id).filter(Boolean))];
  for (const room of rooms) {
    if (room.owner_id && room.owner_id !== userId) otherIds.push(room.owner_id);
  }
  const uniqueOtherIds = [...new Set(otherIds)];
  const { data: profiles, error: profilesError } = uniqueOtherIds.length
    ? await supabase.from("profiles").select("*").in("id", uniqueOtherIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const memberByRoom = new Map<string, string>();
  for (const row of members ?? []) {
    if (row.room_id && row.user_id && row.user_id !== userId && !memberByRoom.has(row.room_id)) memberByRoom.set(row.room_id, row.user_id);
  }
  for (const room of rooms) {
    if (!memberByRoom.has(room.id) && room.owner_id !== userId && room.owner_id) memberByRoom.set(room.id, room.owner_id);
  }

  const lastByRoom = new Map<string, string>();
  for (const row of messages ?? []) {
    if (!row.room_id || !row.created_at) continue;
    const current = lastByRoom.get(row.room_id);
    if (!current || new Date(row.created_at).getTime() > new Date(current).getTime()) lastByRoom.set(row.room_id, row.created_at);
  }

  return rooms.map((room) => ({
    ...(room as Room),
    other_user: profileById.get(memberByRoom.get(room.id) ?? "") ?? null,
    last_message_at: lastByRoom.get(room.id) ?? null,
  }));
}

export const myPrivateChatsQuery = (userId: string | undefined) => queryOptions({
  queryKey: ["private-chats", userId],
  queryFn: () => fetchMyPrivateChats(userId!),
  enabled: Boolean(userId),
  staleTime: 15_000,
});
