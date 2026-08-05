import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Room, RoomMember } from "@/types";

export async function fetchRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRoomBySlug(slug: string): Promise<Room | null> {
  const { data, error } = await supabase.from("rooms").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
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
  const slug =
    input.name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "room";
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
  return data;
}

export async function joinRoom(roomId: string, userId: string) {
  const { error } = await supabase.from("room_members").insert({ room_id: roomId, user_id: userId });
  if (error && error.code !== "23505") throw error;
}

export async function leaveRoom(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

export const roomsQuery = () => queryOptions({ queryKey: ["rooms"], queryFn: fetchRooms });

export const roomQuery = (slug: string) =>
  queryOptions({ queryKey: ["rooms", slug], queryFn: () => fetchRoomBySlug(slug) });

export const myMembershipsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["room_members", userId],
    queryFn: () => fetchMyMemberships(userId!),
    enabled: Boolean(userId),
  });