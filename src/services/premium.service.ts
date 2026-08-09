import { supabase } from "@/integrations/supabase/client";
import { looseDb } from "@/integrations/supabase/loose-db";

export type PremiumPlan = "weekly" | "monthly" | "yearly";

export type PremiumSubscription = {
  id: string;
  user_id: string;
  plan: PremiumPlan;
  status: "pending" | "active" | "expired" | "cancelled";
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export async function fetchMyPremiumSubscription(userId: string) {
  const { data, error } = await looseDb
    .from("premium_subscriptions")
    .select("id,user_id,plan,status,started_at,expires_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PremiumSubscription | null;
}

export async function requestPremium(userId: string, plan: PremiumPlan) {
  const { data: existing, error: existingError } = await looseDb
    .from("premium_subscriptions")
    .select("id,status")
    .eq("user_id", userId)
    .in("status", ["pending", "active"])
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    if (existing.status === "active") throw new Error("لديك اشتراك مدفوع فعال بالفعل.");
    throw new Error("لديك طلب اشتراك قيد المراجعة بالفعل.");
  }

  const { data, error } = await looseDb
    .from("premium_subscriptions")
    .insert({ user_id: userId, plan, status: "pending" })
    .select("id,user_id,plan,status,started_at,expires_at,created_at")
    .single();
  if (error) throw error;
  return data as PremiumSubscription;
}

export async function hasActivePremium(userId: string) {
  const { data, error } = await looseDb.rpc("has_active_premium", { check_user_id: userId });
  if (error) throw error;
  return Boolean(data);
}
