-- Global Owner is a public platform role, so authenticated users may resolve
-- which member is the Global Owner for display purposes. Authorization remains
-- enforced by the existing Global Owner checks and room policies.
DROP POLICY IF EXISTS "platform owners can read all" ON public.platform_owners;
CREATE POLICY "platform owners can read all"
ON public.platform_owners
FOR SELECT
TO authenticated
USING (true);
