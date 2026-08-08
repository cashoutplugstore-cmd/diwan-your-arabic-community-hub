-- Diwan VIP plans: 14 days for €4.99, 1 month for €15.99.
-- Keep pricing out of the client as a source of truth; Stripe will become authoritative after checkout/webhook integration.

alter table public.premium_subscriptions
  drop constraint if exists premium_subscriptions_plan_check;

alter table public.premium_subscriptions
  add constraint premium_subscriptions_plan_check
  check (plan in ('two_week', 'monthly'));
