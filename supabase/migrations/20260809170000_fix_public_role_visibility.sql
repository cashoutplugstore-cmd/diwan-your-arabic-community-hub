-- Fix role visibility across clients.
-- Staff badges are public profile metadata, while management actions remain protected
-- by the existing permission checks/RLS. Members must be able to read roles of other
-- authenticated users so an admin/moderator badge is consistent on every device.

DROP POLICY IF EXISTS "user_roles_read_own" ON public.user_roles;

CREATE POLICY "user_roles_authenticated_read"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);
