-- Room-level admin role: distinct from platform user_roles.admin.
-- Only the room owner or platform admin can grant/revoke the room-admin role.
-- A room admin can manage moderator/member roles and moderation actions, but cannot grant room-admin.

DROP POLICY IF EXISTS "room_members_manage_roles" ON public.room_members;

CREATE POLICY "room_members_manage_roles" ON public.room_members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rooms r
    WHERE r.id = room_members.room_id
      AND (
        r.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR EXISTS (
          SELECT 1
          FROM public.room_members actor
          WHERE actor.room_id = r.id
            AND actor.user_id = auth.uid()
            AND actor.role = 'admin'
        )
      )
      AND r.owner_id <> room_members.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.rooms r
    WHERE r.id = room_members.room_id
      AND (
        r.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR EXISTS (
          SELECT 1
          FROM public.room_members actor
          WHERE actor.room_id = r.id
            AND actor.user_id = auth.uid()
            AND actor.role = 'admin'
        )
      )
      AND (
        role IN ('moderator', 'member')
        OR (
          role = 'admin'
          AND (
            r.owner_id = auth.uid()
            OR public.has_role(auth.uid(), 'admin')
          )
        )
      )
  )
);
