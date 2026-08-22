-- Make Global Owner a database-enforced platform authority.
-- This is intentionally separate from room_members.role.

create or replace function public.is_room_banned(_room_id uuid, _user_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select case
    when public.is_global_owner(_user_id) then false
    else exists (
      select 1 from public.room_bans
      where room_id = _room_id
        and user_id = _user_id
        and (banned_until is null or banned_until > now())
    )
  end;
$$;

create or replace function public.can_view_room(_room_id uuid, _user_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.rooms
    where id = _room_id
      and not public.is_room_banned(_room_id, _user_id)
      and (
        public.is_global_owner(_user_id)
        or not is_private
        or owner_id = _user_id
        or public.is_room_member(_room_id, _user_id)
      )
  );
$$;

-- Rooms: Global Owner can see, update and delete any non-system room.
drop policy if exists rooms_select_global_owner on public.rooms;
create policy rooms_select_global_owner on public.rooms
for select to authenticated
using (public.is_global_owner(auth.uid()));

drop policy if exists rooms_update_global_owner on public.rooms;
create policy rooms_update_global_owner on public.rooms
for update to authenticated
using (public.is_global_owner(auth.uid()))
with check (public.is_global_owner(auth.uid()));

drop policy if exists rooms_delete_global_owner on public.rooms;
create policy rooms_delete_global_owner on public.rooms
for delete to authenticated
using (public.is_global_owner(auth.uid()) and not is_system);

-- Messages: Global Owner can read and moderate messages in every room.
drop policy if exists messages_select_global_owner on public.messages;
create policy messages_select_global_owner on public.messages
for select to authenticated
using (public.is_global_owner(auth.uid()));

drop policy if exists messages_insert_global_owner on public.messages;
create policy messages_insert_global_owner on public.messages
for insert to authenticated
with check (public.is_global_owner(auth.uid()) and user_id = auth.uid());

drop policy if exists messages_update_global_owner on public.messages;
create policy messages_update_global_owner on public.messages
for update to authenticated
using (public.is_global_owner(auth.uid()))
with check (public.is_global_owner(auth.uid()));

drop policy if exists messages_delete_global_owner on public.messages;
create policy messages_delete_global_owner on public.messages
for delete to authenticated
using (public.is_global_owner(auth.uid()));

-- Membership management: Global Owner can inspect, add, change and remove memberships.
drop policy if exists room_members_select_global_owner on public.room_members;
create policy room_members_select_global_owner on public.room_members
for select to authenticated
using (public.is_global_owner(auth.uid()));

drop policy if exists room_members_insert_global_owner on public.room_members;
create policy room_members_insert_global_owner on public.room_members
for insert to authenticated
with check (public.is_global_owner(auth.uid()) and not is_room_banned(room_id, user_id));

drop policy if exists room_members_update_global_owner on public.room_members;
create policy room_members_update_global_owner on public.room_members
for update to authenticated
using (public.is_global_owner(auth.uid()))
with check (public.is_global_owner(auth.uid()));

drop policy if exists room_members_delete_global_owner on public.room_members;
create policy room_members_delete_global_owner on public.room_members
for delete to authenticated
using (public.is_global_owner(auth.uid()));

-- Moderation and bans: Global Owner has full moderation authority.
drop policy if exists global_owner_create_room_moderation on public.room_moderation;
create policy global_owner_create_room_moderation on public.room_moderation
for insert to authenticated
with check (public.is_global_owner(auth.uid()) and created_by = auth.uid());

drop policy if exists global_owner_remove_room_moderation on public.room_moderation;
create policy global_owner_remove_room_moderation on public.room_moderation
for delete to authenticated
using (public.is_global_owner(auth.uid()));

drop policy if exists room_moderation_select_global_owner on public.room_moderation;
create policy room_moderation_select_global_owner on public.room_moderation
for select to authenticated
using (public.is_global_owner(auth.uid()));

drop policy if exists room_bans_insert_global_owner on public.room_bans;
create policy room_bans_insert_global_owner on public.room_bans
for insert to authenticated
with check (public.is_global_owner(auth.uid()) and banned_by = auth.uid());

drop policy if exists room_bans_delete_global_owner on public.room_bans;
create policy room_bans_delete_global_owner on public.room_bans
for delete to authenticated
using (public.is_global_owner(auth.uid()));
