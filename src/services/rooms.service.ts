import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CountryNode, Profile, RegionNode, Room, RoomMember, RoomWithStats } from "@/types";

type RoomDb = Room & {
  country_code?: string | null;
  city_name?: string | null;
  created_at?: string | null;
};

type CommunityRoom = RoomWithStats & {
  region: "arab" | "europe";
  country: string;
  city: string | null;
  last_activity_at: string | null;
};

const EUROPE_COUNTRIES = new Set(["finland-arabs", "france", "uk"]);

function normalizeRoom(room: RoomDb): CommunityRoom {
  const countryCode = room.country_code ?? null;
  const country = countryCode ?? "—";
  const city = room.city_name ?? null;
  const lastActivity = room.created_at ?? null;

  return {
    ...room,
    region: EUROPE_COUNTRIES.has(countryCode ?? "") ? "europe" : "arab",
    country,
    city,
    last_activity_at: lastActivity,
  } as CommunityRoom;
}

export async function fetchRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((room) => normalizeRoom(room as RoomDb)) as Room[];
}

/** Fetch rooms using the current database schema. Stats are optional and must never prevent rooms from loading. */
export async function fetchRoomsWithStats(): Promise<RoomWithStats[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((rawRoom) => {
    const room = normalizeRoom(rawRoom as RoomDb);
    return {
      ...room,
      member_count: 0,
      message_count: 0,
      last_message_at: null,
    };
  }) as RoomWithStats[];
}

/** Groups public rooms into region → country → city using the current rooms schema. */
export function buildCommunityTree(rooms: RoomWithStats[]): RegionNode[] {
  const regions: RegionNode[] = [];
  for (const region of ["arab", "europe"] as const) {
    const scoped = rooms.filter((r) => (r as CommunityRoom).region === region && !r.is_private);
    if (scoped.length === 0) continue;
    const byCountry = new Map<string, CountryNode>();
    for (const room of scoped) {
      const country = (room as CommunityRoom).country ?? "—";
      const node = byCountry.get(country) ?? { country, cities: [], member_count: 0, message_count: 0 };
      node.cities.push(room);
      node.member_count += room.member_count;
      node.message_count += room.message_count;
      byCountry.set(country, node);
    }
    const countries = [...byCountry.values()].sort((a, b) => b.message_count - a.message_count);
    regions.push({
      region,
      countries,
      room_count: scoped.length,
      member_count: countries.reduce((sum, c) => sum + c.member_count, 0),
    });
  }
  return regions;
}

export async function fetchRoomMembers(roomId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .limit(200);
  if (error) throw error;
  const ids = (data ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (profilesError) throw profilesError;
  return profiles ?? [];
}

export async function fetchRoomBySlug(slug: string): Promise<Room | null> {
  const { data, error } = await supabase.from("rooms").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? (normalizeRoom(data as RoomDb) as Room) : null;
}

export async function fetchMyMemberships(userId: string): Promise<RoomMember[]> {
  const { data, error } = await supabase.from("room_members").select("*").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function createRoom(input: {
  name: string;
  description?: string;
  isPrivate: boolean;
  ownerId: string;
}): Promise<Room> {
  const slug = input.name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "room";
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      name: input.name,
      slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
      description: input.description ?? null,
      is_private: input.isPrivate,
      owner_id: input.ownerId,
    })
    .select("*")
    .single();
  if (error) throw error;
  await supabase.from("room_members").insert({ room_id: data.id, user_id: input.ownerId, role: "owner" });
  return normalizeRoom(data as RoomDb) as Room;
}

export async function joinRoom(roomId: string, userId: string) {
  const { error } = await supabase.from("room_members").insert({ room_id: roomId, user_id: userId });
  if (error && error.code !== "23505") throw error;
}

export async function leaveRoom(roomId: string, userId: string) {
  const { error } = await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
  if (error) throw error;
}

export const roomsQuery = () => queryOptions({ queryKey: ["rooms"], queryFn: fetchRooms });
export const roomsWithStatsQuery = () => queryOptions({ queryKey: ["rooms", "stats"], queryFn: fetchRoomsWithStats, staleTime: 30_000 });
export const roomMembersQuery = (roomId: string | undefined) => queryOptions({ queryKey: ["room_members", "profiles", roomId], queryFn: () => fetchRoomMembers(roomId!), enabled: Boolean(roomId) });
export const roomQuery = (slug: string) => queryOptions({ queryKey: ["rooms", slug], queryFn: () => fetchRoomBySlug(slug) });
export const myMembershipsQuery = (userId: string | undefined) => queryOptions({ queryKey: ["room_members", userId], queryFn: () => fetchMyMemberships(userId!), enabled: Boolean(userId) });

// Production redeploy marker: rooms are loaded directly from the current public rooms schema.
