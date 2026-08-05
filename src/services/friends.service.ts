import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Friendship, Profile } from "@/types";

export type FriendshipWithProfile = Friendship & { other: Profile | null };

export async function fetchFriendships(userId: string): Promise<FriendshipWithProfile[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const otherIds = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
  if (otherIds.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", otherIds);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    other: byId.get(r.requester_id === userId ? r.addressee_id : r.requester_id) ?? null,
  }));
}

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: requesterId, addressee_id: addresseeId });
  if (error && error.code !== "23505") throw error;
}

export async function respondToRequest(id: string, status: "accepted" | "blocked") {
  const { error } = await supabase.from("friendships").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function removeFriendship(id: string) {
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) throw error;
}

export const friendshipsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["friendships", userId],
    queryFn: () => fetchFriendships(userId!),
    enabled: Boolean(userId),
  });