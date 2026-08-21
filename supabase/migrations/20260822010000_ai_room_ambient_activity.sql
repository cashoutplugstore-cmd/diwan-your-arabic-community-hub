create table if not exists public.ai_room_ambient_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  next_member_index integer not null default 0,
  last_generated_at timestamptz
);

alter table public.ai_room_ambient_state enable row level security;

create or replace function public.claim_ai_room_ambient(
  p_room_id uuid,
  p_min_interval_seconds integer default 45
)
returns table(claimed boolean, member_index integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_index integer;
begin
  if auth.uid() is null then
    return query select false, 0;
    return;
  end if;

  if not exists (
    select 1 from public.rooms
    where id = p_room_id
      and is_private = false
  ) then
    return query select false, 0;
    return;
  end if;

  insert into public.ai_room_ambient_state(room_id)
  values (p_room_id)
  on conflict (room_id) do nothing;

  update public.ai_room_ambient_state
  set next_member_index = next_member_index + 1,
      last_generated_at = now()
  where room_id = p_room_id
    and (
      last_generated_at is null
      or last_generated_at <= now() - make_interval(secs => greatest(p_min_interval_seconds, 30))
    )
  returning next_member_index - 1 into updated_index;

  return query select updated_index is not null, coalesce(updated_index, 0);
end;
$$;

grant execute on function public.claim_ai_room_ambient(uuid, integer) to authenticated;
