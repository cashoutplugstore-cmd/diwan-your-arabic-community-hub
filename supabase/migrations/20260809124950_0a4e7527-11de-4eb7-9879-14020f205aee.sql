CREATE OR REPLACE FUNCTION public.can_manage_room_roles(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = _room_id AND r.owner_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_moderate_room(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'moderator')
      OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = _room_id AND r.owner_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.room_members m WHERE m.room_id = _room_id AND m.user_id = _user_id AND m.role IN ('moderator','owner'))
$$;

DROP POLICY IF EXISTS room_members_update_roles ON public.room_members;
CREATE POLICY room_members_update_roles ON public.room_members
FOR UPDATE TO authenticated
USING (user_id <> auth.uid() AND role <> 'owner' AND public.can_manage_room_roles(room_id, auth.uid()))
WITH CHECK (user_id <> auth.uid() AND role IN ('member','moderator') AND public.can_manage_room_roles(room_id, auth.uid()));