import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isGlobalOwner } from "@/services/platform-owner.service";

export type StaffRole = {
  isGlobalOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
};

export async function fetchMyRoles(userId: string): Promise<StaffRole> {
  const [{ data, error }, globalOwner] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    isGlobalOwner(userId),
  ]);

  // Global Owner is platform-wide and must never inherit legacy ADMIN/MOD
  // presentation inside rooms or chat messages.
  if (globalOwner) {
    return {
      isGlobalOwner: true,
      isAdmin: false,
      isModerator: false,
      isStaff: true,
    };
  }

  // Role metadata must never prevent chat/DM from rendering.
  if (error) {
    console.warn("Legacy role lookup unavailable; continuing with safe defaults.", error);
    return {
      isGlobalOwner: false,
      isAdmin: false,
      isModerator: false,
      isStaff: false,
    };
  }

  const roles = new Set((data ?? []).map((r) => r.role));
  const isAdmin = roles.has("admin");
  const isModerator = roles.has("moderator");
  return {
    isGlobalOwner: false,
    isAdmin,
    isModerator,
    isStaff: isAdmin || isModerator,
  };
}

export const myRolesQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-roles", userId],
    queryFn: () => fetchMyRoles(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
    retry: 1,
  });
