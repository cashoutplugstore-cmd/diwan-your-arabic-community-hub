import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Profile } from "@/types";
export type Report = Tables<"reports">;
export type RoomModeration = Tables<"room_moderation">;
export type UserBlock = Tables<"user_blocks">;
export const REPORT_REASONS = ["spam", "abuse", "hate", "sexual", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export async function submitReport(input: {
  reporterId: string;
  targetUserId?: string | null;
  messageId?: string | null;
  roomId?: string | null;
  reason: ReportReason;
  details?: string;
}) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    target_user_id: input.targetUserId ?? null,
    message_id: input.messageId ?? null,
    room_id: input.roomId ?? null,
    reason: input.reason,
    details: input.details?.trim().slice(0, 1000) || null,
  });
  if (error) throw error;
}
export async function fetchMyBlocks(userId: string) {
  const { data, error } = await supabase.from("user_blocks").select("*").eq("blocker_id", userId);
  if (error) throw error;
  return data ?? [];
}
export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && error.code !== "23505") throw error;
}
export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}
export async function fetchBlockedProfiles(userId: string): Promise<Profile[]> {
  const blocks = await fetchMyBlocks(userId);
  const ids = blocks.map((b) => b.blocked_id);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
  if (error) throw error;
  return data ?? [];
}
export async function fetchRoomRestrictions(roomId: string) {
  const { data, error } = await supabase.from("room_moderation").select("*").eq("room_id", roomId);
  if (error) throw error;
  return data ?? [];
}
export async function restrictInRoom(input: {
  roomId: string;
  userId: string;
  kind: "ban" | "mute";
  createdBy: string;
  reason?: string;
}) {
  const { error } = await supabase.from("room_moderation").insert({
    room_id: input.roomId,
    user_id: input.userId,
    kind: input.kind,
    created_by: input.createdBy,
    reason: input.reason ?? null,
  });
  if (error && error.code !== "23505") throw error;
}
export async function liftRestriction(roomId: string, userId: string, kind: "ban" | "mute") {
  const { error } = await supabase
    .from("room_moderation")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .eq("kind", kind);
  if (error) throw error;
}
export async function fetchReports() {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}
export async function updateReportStatus(id: string, status: "resolved" | "dismissed") {
  const { error } = await supabase
    .from("reports")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
export const myBlocksQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["user_blocks", userId],
    queryFn: () => fetchMyBlocks(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
export const blockedProfilesQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["user_blocks", "profiles", userId],
    queryFn: () => fetchBlockedProfiles(userId!),
    enabled: Boolean(userId),
  });
export const roomRestrictionsQuery = (roomId: string | undefined) =>
  queryOptions({
    queryKey: ["room_moderation", roomId],
    queryFn: () => fetchRoomRestrictions(roomId!),
    enabled: Boolean(roomId),
  });
export const reportsQuery = (enabled: boolean) =>
  queryOptions({ queryKey: ["reports"], queryFn: fetchReports, enabled });
