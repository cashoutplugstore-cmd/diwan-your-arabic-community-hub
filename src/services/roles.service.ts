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

  // Role metadata must never prevent chat/DM from rendering.
  // If the legacy role query is unavailable, preserve the independently
  // verified Global Owner state and fail closed for legacy staff roles.
  if (error) {
    console.warn("Legacy role lookup unavailable; continuing with safe defaults.", error);
    return {
      isGlobalOwner: globalOwner,
      isAdmin: false,
      isModerator: false,
      isStaff: globalOwner,
    };
  }

  const roles = new Set((data ?? []).map((r) => r.role));
  const isAdmin = roles.has("admin");
  const isModerator = roles.has("moderator");
  return {
    isGlobalOwner: globalOwner,
    isAdmin,
    isModerator,
    isStaff: globalOwner || isAdmin || isModerator,
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
