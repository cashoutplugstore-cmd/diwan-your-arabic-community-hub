-- Direct messages: every private room owner must also be a member.
-- This fixes old DMs that were visible only when opened from a profile.
INSERT INTO public.room_members (room_id, user_id, role)
SELECT r.id, r.owner_id, 'owner'
FROM public.rooms r
WHERE r.is_private = true
  AND r.owner_id IS NOT NULL
ON CONFLICT (room_id, user_id) DO UPDATE SET role = 'owner';

CREATE OR REPLACE FUNCTION public.ensure_private_room_owner_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_private = true AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.room_members (room_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (room_id, user_id) DO UPDATE SET role = 'owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS private_room_owner_member ON public.rooms;
CREATE TRIGGER private_room_owner_member
AFTER INSERT OR UPDATE OF is_private, owner_id ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.ensure_private_room_owner_member();

-- Persistent DM read state for unread badges.
CREATE TABLE IF NOT EXISTS public.private_chat_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);

GRANT SELECT, INSERT, UPDATE ON public.private_chat_reads TO authenticated;
GRANT ALL ON public.private_chat_reads TO service_role;
ALTER TABLE public.private_chat_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS private_chat_reads_own ON public.private_chat_reads;
CREATE POLICY private_chat_reads_own ON public.private_chat_reads
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mark_private_chat_read(_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = _room_id
      AND r.is_private = true
      AND (r.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.room_members m WHERE m.room_id = r.id AND m.user_id = auth.uid()
      ))
  ) THEN
    INSERT INTO public.private_chat_reads (user_id, room_id, last_read_at)
    VALUES (auth.uid(), _room_id, now())
    ON CONFLICT (user_id, room_id) DO UPDATE SET last_read_at = now();
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_private_chat_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.private_chat_unread_counts()
RETURNS TABLE (room_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id,
         count(m.id) FILTER (WHERE m.user_id <> auth.uid()) AS unread_count
  FROM public.rooms r
  LEFT JOIN public.private_chat_reads rd
    ON rd.room_id = r.id AND rd.user_id = auth.uid()
  LEFT JOIN public.messages m
    ON m.room_id = r.id
   AND m.is_deleted = false
   AND m.created_at > COALESCE(rd.last_read_at, r.created_at)
  WHERE r.is_private = true
    AND (r.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid()
    ))
  GROUP BY r.id;
$$;
GRANT EXECUTE ON FUNCTION public.private_chat_unread_counts() TO authenticated;
