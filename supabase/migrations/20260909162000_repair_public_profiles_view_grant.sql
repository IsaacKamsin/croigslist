create or replace view public.public_profiles
with (security_invoker = false) as
select
  id,
  full_name,
  handle,
  city,
  role,
  garage_name,
  garage_image_url,
  avatar_url,
  bio,
  is_verified,
  bikes_count,
  created_at
from public.profiles
where public.is_approved_member(id);

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;
