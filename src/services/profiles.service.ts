import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  const { error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function searchProfiles(term: string): Promise<Profile[]> {
  const normalized = term.trim();
  if (!normalized) return [];

  // Do not interpolate user input into PostgREST's `.or()` filter syntax.
  // Separate ilike queries keep search text out of the filter expression grammar.
  const pattern = `%${normalized}%`;
  const [usernameRes, displayNameRes] = await Promise.all([
    supabase.from("profiles").select("*").ilike("username", pattern).limit(20),
    supabase.from("profiles").select("*").ilike("display_name", pattern).limit(20),
  ]);
  if (usernameRes.error) throw usernameRes.error;
  if (displayNameRes.error) throw displayNameRes.error;

  const byId = new Map<string, Profile>();
  for (const profile of [...(usernameRes.data ?? []), ...(displayNameRes.data ?? [])]) {
    byId.set(profile.id, profile);
  }
  return [...byId.values()].slice(0, 20);
}

export const profileQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
  });

export const isAdminQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["is-admin", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    enabled: Boolean(userId),
  });
