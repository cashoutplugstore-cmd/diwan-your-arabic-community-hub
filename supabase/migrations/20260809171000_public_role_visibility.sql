ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_authenticated ON public.user_roles;
CREATE POLICY user_roles_select_authenticated
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.get_public_user_roles(_user_ids uuid[])
RETURNS TABLE(user_id uuid, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id, ur.role::text
  FROM public.user_roles ur
  WHERE ur.user_id = ANY(_user_ids)
    AND ur.role::text IN ('admin', 'moderator');
$$;

REVOKE ALL ON FUNCTION public.get_public_user_roles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_user_roles(uuid[]) TO authenticated;
