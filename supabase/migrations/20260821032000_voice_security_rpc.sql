-- Narrow voice mutations: clients may self-mute/leave, but speaker and moderator mute state are server-controlled.
create or replace function public.voice_leave()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.room_voice_participants
  where user_id = auth.uid();
end;
$$;

grant execute on function public.voice_leave() to authenticated;

create or replace function public.voice_set_self_muted(_room_id uuid, _muted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.room_voice_participants p
    where p.room_id = _room_id and p.user_id = auth.uid()
  ) then
    raise exception 'voice_participant_not_found';
  end if;

  update public.room_voice_participants
  set is_muted = _muted
  where room_id = _room_id and user_id = auth.uid();
end;
$$;

grant execute on function public.voice_set_self_muted(uuid, boolean) to authenticated;

create or replace function public.voice_moderator_mute(_room_id uuid, _user_id uuid, _muted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_moderate_room(_room_id, auth.uid()) then
    raise exception 'voice_moderation_forbidden';
  end if;

  update public.room_voice_participants
  set is_muted = _muted,
      muted_by = case when _muted then auth.uid() else null end
  where room_id = _room_id and user_id = _user_id;
end;
$$;

grant execute on function public.voice_moderator_mute(uuid, uuid, boolean) to authenticated;

-- Remove broad client UPDATE access. Voice state changes now go through narrow RPCs.
drop policy if exists room_voice_update_self on public.room_voice_participants;
drop policy if exists "room_voice_update_self" on public.room_voice_participants;
