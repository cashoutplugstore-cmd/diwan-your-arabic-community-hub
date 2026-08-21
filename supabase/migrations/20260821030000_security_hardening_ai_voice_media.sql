-- Security hardening for AI, voice moderation, and private media authorization.

create table if not exists public.ai_request_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

grant all on public.ai_request_limits to service_role;
alter table public.ai_request_limits enable row level security;

create or replace function public.consume_ai_request(_user_id uuid, _limit integer default 20, _window_seconds integer default 60)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  current_window timestamptz;
begin
  if _user_id is null or _limit < 1 or _window_seconds < 1 then
    return false;
  end if;

  select request_count, window_started_at
    into current_count, current_window
  from public.ai_request_limits
  where user_id = _user_id
  for update;

  if not found then
    insert into public.ai_request_limits(user_id, request_count, window_started_at, updated_at)
    values (_user_id, 1, now(), now())
    on conflict (user_id) do nothing;
    select request_count, window_started_at into current_count, current_window
    from public.ai_request_limits where user_id = _user_id for update;
    if current_count = 1 then return true; end if;
  end if;

  if current_window < now() - make_interval(secs => _window_seconds) then
    update public.ai_request_limits
      set request_count = 1, window_started_at = now(), updated_at = now()
      where user_id = _user_id;
    return true;
  end if;

  if current_count >= _limit then
    return false;
  end if;

  update public.ai_request_limits
    set request_count = request_count + 1, updated_at = now()
    where user_id = _user_id;
  return true;
end;
$$;

grant execute on function public.consume_ai_request(uuid, integer, integer) to service_role;

-- Voice moderation: clients may join/leave and self-mute, but cannot forge speaker state
-- or undo a moderator mute through a direct UPDATE.
alter table public.room_voice_participants
  add column if not exists muted_by uuid references auth.users(id) on delete set null;

create or replace function public.guard_voice_participant_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  moderator boolean;
begin
  moderator := public.can_moderate_room(OLD.room_id, auth.uid());

  if not moderator then
    if NEW.user_id <> OLD.user_id or NEW.room_id <> OLD.room_id then
      raise exception 'voice_identity_change_forbidden';
    end if;
    if NEW.is_speaker is distinct from OLD.is_speaker then
      raise exception 'speaker_state_change_forbidden';
    end if;
    if OLD.muted_by is not null and NEW.is_muted = false then
      raise exception 'moderator_mute_cannot_be_undone';
    end if;
    if NEW.muted_by is distinct from OLD.muted_by then
      raise exception 'mute_owner_change_forbidden';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists guard_voice_participant_update on public.room_voice_participants;
create trigger guard_voice_participant_update
before update on public.room_voice_participants
for each row execute function public.guard_voice_participant_update();

-- Structured metadata for private-chat media. Authorization should not depend on parsing
-- JSON stored in messages.content.
create table if not exists public.chat_media (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.messages(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image','audio')),
  mime_type text,
  original_name text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

grant select on public.chat_media to authenticated;
grant all on public.chat_media to service_role;
alter table public.chat_media enable row level security;

drop policy if exists chat_media_participant_read on public.chat_media;
create policy chat_media_participant_read on public.chat_media
for select to authenticated
using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = chat_media.room_id
      and rm.user_id = auth.uid()
  )
);

create or replace function public.index_private_chat_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
  room_private boolean;
begin
  select r.is_private into room_private from public.rooms r where r.id = NEW.room_id;
  if coalesce(room_private, false) = false then return NEW; end if;

  begin
    payload := NEW.content::jsonb;
  exception when others then
    return NEW;
  end;

  if payload ? 'path' and payload ? 'type' and payload->>'type' in ('image','audio') then
    insert into public.chat_media(
      message_id, room_id, uploader_id, storage_path, media_type, mime_type, original_name, size_bytes
    ) values (
      NEW.id, NEW.room_id, NEW.user_id, payload->>'path', payload->>'type',
      nullif(payload->>'mime',''), nullif(payload->>'name',''), nullif(payload->>'size','')::bigint
    ) on conflict (message_id) do update set
      storage_path = excluded.storage_path,
      media_type = excluded.media_type,
      mime_type = excluded.mime_type,
      original_name = excluded.original_name,
      size_bytes = excluded.size_bytes;
  end if;
  return NEW;
end;
$$;

drop trigger if exists index_private_chat_media on public.messages;
create trigger index_private_chat_media
after insert or update of content on public.messages
for each row execute function public.index_private_chat_media();

-- Backfill existing private media messages that already use the JSON payload format.
insert into public.chat_media(message_id, room_id, uploader_id, storage_path, media_type, mime_type, original_name, size_bytes)
select m.id, m.room_id, m.user_id,
       j.p->>'path', j.p->>'type', nullif(j.p->>'mime',''), nullif(j.p->>'name',''), nullif(j.p->>'size','')::bigint
from public.messages m
join public.rooms r on r.id = m.room_id and r.is_private = true
cross join lateral (select m.content::jsonb as p) j
where m.content ~ '^\\s*\\{'
  and j.p ? 'path' and j.p ? 'type'
  and j.p->>'type' in ('image','audio')
on conflict (message_id) do nothing;

-- Replace the text-parsing storage authorization with structured metadata.
drop policy if exists "DM media read for chat participants" on storage.objects;
create policy "DM media read for chat participants"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-media'
  and exists (
    select 1 from public.chat_media cm
    join public.room_members rm on rm.room_id = cm.room_id and rm.user_id = auth.uid()
    where cm.storage_path = storage.objects.name
  )
);
