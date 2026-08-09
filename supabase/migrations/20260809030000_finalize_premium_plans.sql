-- Final Diwan VIP plans: weekly, monthly, yearly.
-- Migrate the earlier plan names before tightening the allowed values.
update public.premium_subscriptions
set plan = case plan
  when 'vip_biweekly' then 'weekly'
  when 'pro_monthly' then 'monthly'
  when 'community_monthly' then 'yearly'
  else plan
end
where plan in ('vip_biweekly', 'pro_monthly', 'community_monthly');

alter table public.premium_subscriptions
drop constraint if exists premium_subscriptions_plan_check;

alter table public.premium_subscriptions
add constraint premium_subscriptions_plan_check
check (plan in ('weekly', 'monthly', 'yearly'));
