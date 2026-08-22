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
  if (error) throw error;
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
  });
