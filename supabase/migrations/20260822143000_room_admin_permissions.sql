-- Make room admin a real, persisted room-level role with strict hierarchy.
DROP POLICY IF EXISTS "room_members_manage_roles" ON public.room_members;

CREATE POLICY "room_members_manage_roles" ON public.room_members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id
      AND r.owner_id <> room_members.user_id
      AND (
        r.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR EXISTS (
          SELECT 1 FROM public.room_members actor
          WHERE actor.room_id = r.id
            AND actor.user_id = auth.uid()
            AND actor.role = 'admin'
            AND room_members.role IN ('member', 'moderator')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id
      AND (
        r.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (
          role IN ('member', 'moderator')
          AND EXISTS (
            SELECT 1 FROM public.room_members actor
            WHERE actor.room_id = r.id
              AND actor.user_id = auth.uid()
              AND actor.role = 'admin'
          )
        )
      )
  )
  AND role IN ('owner', 'admin', 'moderator', 'member')
);

COMMENT ON COLUMN public.room_members.role IS 'Room role: owner, admin, moderator, or member. Admin is a room-level administrator and is distinct from global user_roles.admin.';
