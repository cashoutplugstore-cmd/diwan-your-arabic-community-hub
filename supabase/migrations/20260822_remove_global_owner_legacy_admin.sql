-- Global Owner is platform-wide and must not also carry the legacy global admin role.
-- Keep platform ownership in public.platform_owners; room permissions already
-- derive Global Owner authority from that table independently of user_roles.
delete from public.user_roles
where user_id = '25b4071d-f7f5-49fd-bea9-a5de81309f8a'
  and role = 'admin';
