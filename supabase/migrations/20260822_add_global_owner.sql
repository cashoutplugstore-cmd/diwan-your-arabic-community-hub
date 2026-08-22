-- Global Owner is platform-wide and intentionally separate from room_members.role.
create table if not exists public.platform_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_owners enable row level security;

-- Users may read only their own platform-owner record.
create policy "platform owners can read self"
on public.platform_owners
for select
to authenticated
using (auth.uid() = user_id);

-- Bootstrap the designated platform owner by immutable auth user id.
insert into public.platform_owners (user_id)
values ('25b4071d-f7f5-49fd-bea9-a5de81309f8a5'::uuid)
on conflict (user_id) do nothing;
