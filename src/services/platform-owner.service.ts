import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global-owner lookup is an authorization helper, not a reason to crash the chat UI.
 * Database/RLS/network failures fail closed (false) while normal errors remain observable
 * through the browser/network layer. A successful lookup still returns the real owner state.
 */
export async function isGlobalOwner(userId: string): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabase
    .from("platform_owners")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Global owner lookup unavailable; failing closed.", error);
    return false;
  }

  return Boolean(data);
}

export const globalOwnerQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["global-owner", userId],
    queryFn: () => isGlobalOwner(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
