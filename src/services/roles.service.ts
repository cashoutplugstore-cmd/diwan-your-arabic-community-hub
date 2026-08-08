import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = { isAdmin: boolean; isModerator: boolean; isStaff: boolean };

export async function fetchMyRoles(userId: string): Promise<StaffRole> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  const roles = new Set((data ?? []).map((r) => r.role));
  const isAdmin = roles.has("admin");
  const isModerator = roles.has("moderator");
  return { isAdmin, isModerator, isStaff: isAdmin || isModerator };
}

export const myRolesQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-roles", userId],
    queryFn: () => fetchMyRoles(userId!),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });
