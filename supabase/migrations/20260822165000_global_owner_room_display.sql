-- Global Owner is a platform-wide authority, not a room moderator/admin.
-- Normalize any legacy room membership role so the Global Owner cannot appear as MOD.
-- Permissions remain platform-wide through public.is_global_owner().

UPDATE public.room_members
SET role = 'owner'
WHERE user_id IN (
  SELECT user_id FROM public.platform_owners
)
AND role IN ('moderator', 'admin');

-- Also remove legacy global roles that could leak into UI role resolution.
DELETE FROM public.user_roles
WHERE user_id IN (SELECT user_id FROM public.platform_owners)
  AND role IN ('admin', 'moderator');
