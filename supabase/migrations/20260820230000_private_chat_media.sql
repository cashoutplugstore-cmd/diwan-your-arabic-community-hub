-- Private DM media bucket. Files are scoped by the authenticated user's id.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do update set public = false;

create policy "DM media upload own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "DM media read for chat participants"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.messages m
      join public.room_members rm on rm.room_id = m.room_id
      join public.rooms r on r.id = m.room_id
      where r.is_private = true
        and rm.user_id = auth.uid()
        and m.content like '%"path":"' || storage.objects.name || '"%'
    )
  )
);

create policy "DM media delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
