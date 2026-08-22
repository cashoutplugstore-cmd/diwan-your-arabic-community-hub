import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types";

export type RoomRole = "owner" | "admin" | "moderator" | "member";

export type RoomMemberRow = { userId: string; role: RoomRole; profile: Profile | null };

export type RoomPermissions = {
  role: RoomRole | null;
  isOwner: boolean;
  isGlobalAdmin: boolean;
  isRoomAdmin: boolean;
  isRoomModerator: boolean;
  canManageRoles: boolean;
  canGrantRoomAdmin: boolean;
  canModerate: boolean;
  canMute: boolean;
  canBan: boolean;
  canDeleteMessages: boolean;
};

export const EMPTY_PERMISSIONS: RoomPermissions = {
  role: null, isOwner: false, isGlobalAdmin: false, isRoomAdmin: false, isRoomModerator: false,
  canManageRoles: false, canGrantRoomAdmin: false, canModerate: false,
  canMute: false, canBan: false, canDeleteMessages: false,
};

/** Real permission resolution from Supabase. UI never decides authority. */
export async function fetchRoomPermissions(roomId: string, userId: string): Promise<RoomPermissions> {
  const [{ data: room }, { data: membership }, { data: globalRoles }] = await Promise.all([
    supabase.from("rooms").select("owner_id").eq("id", roomId).maybeSingle(),
    supabase.from("room_members").select("role").eq("room_id", roomId).eq("user_id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const isOwner = room?.owner_id === userId;
  const roles = new Set((globalRoles ?? []).map((r) => r.role));
  const isGlobalAdmin = roles.has("admin");
  const isGlobalModerator = roles.has("moderator");
  const memberRole = (membership?.role as RoomRole | undefined) ?? null;
  const isRoomAdmin = memberRole === "admin";
  const isRoomModerator = memberRole === "moderator" || isRoomAdmin || memberRole === "owner";
  const canManageRoles = isOwner || isGlobalAdmin || isRoomAdmin;
  const canGrantRoomAdmin = isOwner || isGlobalAdmin;
  const canModerate = canManageRoles || isGlobalModerator;
  return {
    role: isOwner ? "owner" : memberRole,
    isOwner, isGlobalAdmin, isRoomAdmin, isRoomModerator,
    canManageRoles, canGrantRoomAdmin, canModerate,
    canMute: canModerate, canBan: canModerate, canDeleteMessages: canModerate,
  };
}

export const roomPermissionsQuery = (roomId: string | undefined, userId: string | undefined) =>
  queryOptions({
    queryKey: ["room-permissions", roomId, userId],
    queryFn: () => fetchRoomPermissions(roomId!, userId!),
    enabled: Boolean(roomId && userId),
    staleTime: 30_000,
  });

export async function fetchRoomMemberRoles(roomId: string): Promise<RoomMemberRow[]> {
  const { data, error } = await supabase.from("room_members").select("user_id,role").eq("room_id", roomId).limit(300);
  if (error) throw error;
  const rows = data ?? [];
  const ids = rows.map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ userId: r.user_id, role: (r.role as RoomRole) ?? "member", profile: byId.get(r.user_id) ?? null }));
}

export const roomMemberRolesQuery = (roomId: string | undefined) =>
  queryOptions({
    queryKey: ["room-member-roles", roomId],
    queryFn: () => fetchRoomMemberRoles(roomId!),
    enabled: Boolean(roomId),
  });

export async function setRoomMemberRole(roomId: string, userId: string, role: Exclude<RoomRole, "owner">) {
  const { error } = await supabase.from("room_members").update({ role }).eq("room_id", roomId).eq("user_id", userId);
  if (error) throw error;
}
