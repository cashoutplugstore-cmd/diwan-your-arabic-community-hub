-- Server-side guardrails for AI orchestration.
-- Prevent AI from processing its own generated messages and make stale claims recoverable.

alter table if exists public.ai_response_events
  add column if not exists status text not null default 'processing',
  add column if not exists error_message text,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.ai_response_events
  drop constraint if exists ai_response_events_status_check;

alter table if exists public.ai_response_events
  add constraint ai_response_events_status_check
  check (status in ('processing','completed','failed'));

create index if not exists ai_response_events_processing_idx
  on public.ai_response_events (updated_at)
  where status = 'processing';

-- A failed/stale claim may be retried after five minutes. A completed claim remains immutable.
create or replace function public.claim_ai_response(_source_message_id uuid)
returns table (claimed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.ai_response_events%rowtype;
begin
  select * into existing
  from public.ai_response_events
  where source_message_id = _source_message_id
  for update;

  if found then
    if existing.status = 'completed' then
      return query select false;
      return;
    end if;
    if existing.status = 'processing' and existing.updated_at > now() - interval '5 minutes' then
      return query select false;
      return;
    end if;
    update public.ai_response_events
      set status = 'processing', error_message = null, updated_at = now()
      where id = existing.id;
    return query select true;
    return;
  end if;

  insert into public.ai_response_events(source_message_id, status, updated_at)
  values (_source_message_id, 'processing', now());
  return query select true;
exception when unique_violation then
  return query select false;
end;
$$;

grant execute on function public.claim_ai_response(uuid) to service_role;

create or replace function public.finish_ai_response(_source_message_id uuid, _status text, _response_message_id uuid default null, _error_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _status not in ('completed','failed') then
    raise exception 'invalid_ai_response_status';
  end if;
  update public.ai_response_events
  set status = _status, response_message_id = _response_message_id, error_message = _error_message, updated_at = now()
  where source_message_id = _source_message_id;
end;
$$;

grant execute on function public.finish_ai_response(uuid, text, uuid, text) to service_role;
