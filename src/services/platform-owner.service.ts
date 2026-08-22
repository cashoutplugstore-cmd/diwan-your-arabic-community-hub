import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function isGlobalOwner(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("platform_owners")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export const globalOwnerQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["global-owner", userId],
    queryFn: () => isGlobalOwner(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
