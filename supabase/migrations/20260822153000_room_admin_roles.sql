-- Room-scoped admin role: distinct from global user_roles.admin.
ALTER TABLE public.room_members DROP CONSTRAINT IF EXISTS room_members_role_check;
ALTER TABLE public.room_members
  ADD CONSTRAINT room_members_role_check
  CHECK (role IN ('owner', 'admin', 'moderator', 'member'));

-- Allow the room owner, a room admin, or a global admin to manage lower roles.
DROP POLICY IF EXISTS "room_members_manage_roles" ON public.room_members;
CREATE POLICY "room_members_manage_roles" ON public.room_members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id
      AND (
        r.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR EXISTS (
          SELECT 1 FROM public.room_members rm
          WHERE rm.room_id = r.id
            AND rm.user_id = auth.uid()
            AND rm.role = 'admin'
        )
      )
      AND r.owner_id <> room_members.user_id
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id
      AND (
        r.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
  AND role IN ('owner', 'admin', 'moderator', 'member')
);

-- A room admin must not be able to promote another member to room admin.
CREATE OR REPLACE FUNCTION public.prevent_room_admin_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND NEW.role = 'admin' THEN
    IF NOT (
      EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = NEW.room_id AND r.owner_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    ) THEN
      RAISE EXCEPTION 'only the room owner or global admin can grant room admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_admin_escalation_guard ON public.room_members;
CREATE TRIGGER room_admin_escalation_guard
BEFORE UPDATE OF role ON public.room_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_room_admin_escalation();

-- Make role changes observable through Supabase Realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'room_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
  END IF;
END $$;
