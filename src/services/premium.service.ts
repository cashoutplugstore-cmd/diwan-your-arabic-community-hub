import { supabase } from "@/integrations/supabase/client";
import { looseDb } from "@/integrations/supabase/loose-db";

export type PremiumPlan = "vip" | "pro" | "community";

export type PremiumSubscription = {
  id: string; user_id: string; plan: PremiumPlan;
  status: "pending" | "active" | "expired" | "cancelled";
  started_at: string | null; expires_at: string | null; created_at: string;
};

const PRICE_IDS: Record<PremiumPlan, string> = {
  vip: "price_1U2cMXFCQ7iAbrC72v9QzhcA",
  pro: "price_1U2cMbFCQ7iAbrC7XOvYa5Bj",
  community: "price_1U2cMiFCQ7iAbrC7wfy7qI87",
};

export async function fetchMyPremiumSubscription(userId: string) {
  const { data, error } = await looseDb.from("premium_subscriptions")
    .select("id,user_id,plan,status,started_at,expires_at,created_at")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data as PremiumSubscription | null;
}

export async function startPremiumCheckout(userId: string, plan: PremiumPlan, email?: string | null) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.access_token) throw new Error("يرجى تسجيل الدخول أولاً.");
  const { data, error } = await supabase.functions.invoke("stripe-create-checkout", {
    body: { priceId: PRICE_IDS[plan], userId, email: email ?? undefined },
  });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error || "تعذر إنشاء صفحة الدفع.");
  window.location.assign(data.url);
}

export async function hasActivePremium(userId: string) {
  const { data, error } = await looseDb.rpc("has_active_premium", { check_user_id: userId });
  if (error) throw error;
  return Boolean(data);
}
