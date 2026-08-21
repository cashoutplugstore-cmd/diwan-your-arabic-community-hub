create table if not exists public.ai_response_events (
  source_message_id uuid primary key references public.messages(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  status text not null default 'processing' check (status in ('processing','completed')),
  bot_user_id uuid null references auth.users(id) on delete set null,
  response_message_id uuid null references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists ai_response_events_room_created_idx
  on public.ai_response_events(room_id, created_at desc);

alter table public.ai_response_events enable row level security;

revoke all on public.ai_response_events from anon, authenticated;

-- Only trusted backend/service-role code should create or read orchestration state.
-- The client never gets direct table access.
