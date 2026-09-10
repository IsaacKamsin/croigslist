alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_end timestamptz;

alter table public.profiles
  alter column member_status set default 'pending_payment';

alter table public.profiles
  drop constraint if exists profiles_member_status_check;

alter table public.profiles
  add constraint profiles_member_status_check
  check (member_status in ('none', 'pending', 'pending_payment', 'approved', 'rejected'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
  profile_handle text;
  profile_role text;
begin
  profile_name := coalesce(new.raw_user_meta_data->>'name', '');
  profile_handle := regexp_replace(lower(coalesce(nullif(profile_name, ''), split_part(new.email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  profile_handle := trim(both '-' from profile_handle);
  profile_role := coalesce(new.raw_user_meta_data->>'type', 'buyer');

  insert into public.profiles (
    id,
    full_name,
    handle,
    city,
    role,
    bio,
    member_status,
    is_verified
  )
  values (
    new.id,
    profile_name,
    coalesce(nullif(profile_handle, ''), left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'city', ''),
    case when profile_role = 'builder' then 'builder' else 'buyer' end,
    nullif(new.raw_user_meta_data->>'bio', ''),
    'pending_payment',
    profile_role = 'builder'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
