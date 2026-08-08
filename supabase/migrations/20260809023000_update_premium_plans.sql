-- Diwan VIP plans: 1 month for €5.99, 1 year for €25.00.
-- Stripe will become authoritative after checkout/webhook integration.

alter table public.premium_subscriptions
  drop constraint if exists premium_subscriptions_plan_check;

alter table public.premium_subscriptions
  add constraint premium_subscriptions_plan_check
  check (plan in ('monthly', 'yearly'));
