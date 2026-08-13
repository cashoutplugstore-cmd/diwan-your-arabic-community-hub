-- Production hardening applied to the connected Supabase project.
-- Keep this migration in source control so the repository matches production.

alter table public.premium_subscriptions
  add constraint premium_subscriptions_user_id_unique unique (user_id);

-- Friendship status changes are recipient-only and cannot rewrite the participants.
drop policy if exists friendships_update_recipient on public.friendships;
create policy friendships_update_recipient on public.friendships
for update to authenticated
using (addressee_id = (select auth.uid()))
with check (
  addressee_id = (select addressee_id from public.friendships f where f.id = friendships.id)
  and requester_id = (select requester_id from public.friendships f where f.id = friendships.id)
);

-- Notifications and premium activation are server-owned.
revoke insert, delete on public.notifications from authenticated;
drop policy if exists "Users can update their premium subscriptions" on public.premium_subscriptions;
revoke update, delete on public.premium_subscriptions from authenticated;

-- Avoid per-row auth.uid() evaluation in the most common policies.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists rooms_insert on public.rooms;
create policy rooms_insert on public.rooms for insert to authenticated
with check (owner_id = (select auth.uid()));

-- Premium requests can only be created by the authenticated owner in pending state.
drop policy if exists "Users can request premium" on public.premium_subscriptions;
create policy "Users can request premium" on public.premium_subscriptions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and started_at is null
  and expires_at is null
  and provider_customer_id is null
  and provider_subscription_id is null
);
