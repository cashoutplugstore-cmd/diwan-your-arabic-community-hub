import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CountryNode, Profile, RegionNode, Room, RoomMember, RoomWithStats } from "@/types";

type RoomDb = Room & {
  country_code?: string | null;
  city_name?: string | null;
  created_at?: string | null;
};

type CommunityRoom = RoomWithStats & {
  region: "arab" | "europe" | "other";
  country: string;
  city: string | null;
  last_activity_at: string | null;
};

const ARAB_COUNTRIES = new Set([
  "algeria", "algeria-arabs", "bahrain", "comoros", "djibouti", "egypt", "iraq", "jordan",
  "kuwait", "lebanon", "libya", "mauritania", "morocco", "oman", "palestine", "qatar",
  "saudi-arabia", "saudi", "somalia", "sudan", "syria", "tunisia", "uae", "united-arab-emirates",
  "yemen", "الجزائر", "البحرين", "جزر القمر", "جيبوتي", "مصر", "العراق", "الأردن", "الكويت",
  "لبنان", "ليبيا", "موريتانيا", "المغرب", "عمان", "فلسطين", "قطر", "السعودية", "الصومال",
  "السودان", "سوريا", "تونس", "الإمارات", "اليمن",
]);

function isArabicCountry(countryCode?: string | null) {
  return ARAB_COUNTRIES.has((countryCode ?? "").trim().toLowerCase());
}

function normalizeRoom(room: RoomDb): CommunityRoom {
  const countryCode = room.country_code ?? null;
  const country = countryCode ?? "غير مصنفة";
  const city = room.city_name ?? null;
  const lastActivity = room.created_at ?? null;

  return {
    ...room,
    region: isArabicCountry(countryCode) ? "arab" : countryCode ? "europe" : "other",
    country,
    city,
    last_activity_at: lastActivity,
  } as CommunityRoom;
}

export async function fetchRooms(): Promise<Room[]> {
  const { data, error } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((room) => normalizeRoom(room as RoomDb)) as Room[];
}

/** Public directory: never hide existing public rooms merely because metadata is missing. */
export async function fetchRoomsWithStats(): Promise<RoomWithStats[]> {
  const { data, error } = await supabase.from("rooms").select("*").eq("is_private", false).order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((rawRoom) => {
    const room = normalizeRoom(rawRoom as RoomDb);
    return { ...room, member_count: 0, message_count: 0, last_message_at: null } as RoomWithStats;
  });
}

/** Groups all public rooms into country → city without dropping uncategorized rooms. */
export function buildCommunityTree(rooms: RoomWithStats[]): RegionNode[] {
  const scoped = rooms.filter((r) => !r.is_private);
  if (scoped.length === 0) return [];

  const byCountry = new Map<string, CountryNode>();
  for (const room of scoped) {
    const country = (room as CommunityRoom).country ?? "غير مصنفة";
    const node = byCountry.get(country) ?? { country, cities: [], member_count: 0, message_count: 0 };
    node.cities.push(room);
    node.member_count += room.member_count;
    node.message_count += room.message_count;
    byCountry.set(country, node);
  }

  const countries = [...byCountry.values()].sort((a, b) => b.message_count - a.message_count || a.country.localeCompare(b.country, "ar"));
  return [{ region: "arab", countries, room_count: scoped.length, member_count: countries.reduce((sum, c) => sum + c.member_count, 0) }];
}

export async function fetchRoomMembers(roomId: string): Promise<Profile[]> {
  const { data: room, error: roomError } = await supabase.from("rooms").select("owner_id").eq("id", roomId).maybeSingle();
  if (roomError) throw roomError;
  const { data: members, error: membersError } = await supabase.from("room_members").select("user_id").eq("room_id", roomId).limit(200);
  if (membersError) throw membersError;
  const { data: staff, error: staffError } = await supabase.from("user_roles").select("user_id,role").in("role", ["admin", "moderator"]);
  if (staffError) throw staffError;

  const ids = new Set<string>();
  for (const row of members ?? []) if (row.user_id) ids.add(row.user_id);
  if (room?.owner_id) ids.add(room.owner_id);
  for (const row of staff ?? []) if (row.user_id) ids.add(row.user_id);
  if (ids.size === 0) return [];

  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*").in("id", [...ids]);
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

export async function createRoom(input: { name: string; description?: string; isPrivate: boolean; ownerId: string }): Promise<Room> {
  const slug = input.name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "room";
  const { data, error } = await supabase.from("rooms").insert({ name: input.name, slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`, description: input.description ?? null, is_private: input.isPrivate, owner_id: input.ownerId }).select("*").single();
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
export const roomsWithStatsQuery = () => queryOptions({ queryKey: ["rooms", "stats", "all-public"], queryFn: fetchRoomsWithStats, staleTime: 30_000 });
export const roomMembersQuery = (roomId: string | undefined) => queryOptions({ queryKey: ["room_members", "profiles", roomId], queryFn: () => fetchRoomMembers(roomId!), enabled: Boolean(roomId) });
export const roomQuery = (slug: string) => queryOptions({ queryKey: ["rooms", slug], queryFn: () => fetchRoomBySlug(slug) });
export const myMembershipsQuery = (userId: string | undefined) => queryOptions({ queryKey: ["room_members", userId], queryFn: () => fetchMyMemberships(userId!), enabled: Boolean(userId) });
