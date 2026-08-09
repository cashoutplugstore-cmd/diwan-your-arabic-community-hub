ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_members_manage_roles" ON public.room_members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id
      AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      AND r.owner_id <> room_members.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id
      AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
  AND role IN ('owner', 'moderator', 'member')
);
