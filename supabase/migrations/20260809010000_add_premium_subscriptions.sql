create type public.premium_subscription_status as enum ('pending', 'active', 'expired', 'cancelled');

create table public.premium_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  status public.premium_subscription_status not null default 'pending',
  started_at timestamptz,
  expires_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index premium_subscriptions_user_id_idx on public.premium_subscriptions(user_id);
create index premium_subscriptions_active_idx on public.premium_subscriptions(user_id, status, expires_at);

alter table public.premium_subscriptions enable row level security;

create policy "Users can view their premium subscriptions"
on public.premium_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can request premium"
on public.premium_subscriptions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and started_at is null
  and expires_at is null
  and provider_customer_id is null
  and provider_subscription_id is null
);

create or replace function public.has_active_premium(check_user_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.premium_subscriptions
    where user_id = check_user_id
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.has_active_premium(uuid) from public;
grant execute on function public.has_active_premium(uuid) to authenticated;

create or replace function public.touch_premium_subscription_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger premium_subscriptions_updated_at
before update on public.premium_subscriptions
for each row execute function public.touch_premium_subscription_updated_at();
