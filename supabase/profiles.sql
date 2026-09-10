create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  handle text not null,
  city text not null,
  role text not null check (role in ('buyer', 'builder')),
  garage_name text,
  garage_image_url text,
  avatar_url text,
  contact_email text,
  phone text,
  website text,
  bio text,
  member_status text not null default 'pending_payment'
    check (member_status in ('none', 'pending', 'pending_payment', 'approved', 'rejected')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  subscription_current_period_end timestamptz,
  is_verified boolean not null default false,
  bikes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

alter table public.profiles add column if not exists garage_name text;
alter table public.profiles add column if not exists garage_image_url text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists contact_email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists subscription_status text;
alter table public.profiles add column if not exists subscription_current_period_end timestamptz;
alter table public.profiles add column if not exists subscription_cancel_at_period_end boolean not null default false;
alter table public.profiles alter column member_status set default 'pending_payment';

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  email text,
  role text check (role in ('buyer', 'builder')),
  created_by uuid references auth.users(id) on delete set null,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invites enable row level security;

create unique index if not exists invites_code_lower_idx
on public.invites (lower(code));

create index if not exists invites_used_by_idx
on public.invites(used_by);

create or replace function public.normalize_invite_code(invite_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(trim(coalesce(invite_code, '')), '\s+', '', 'g'));
$$;

create or replace function public.is_invite_valid(
  invite_code_input text,
  email_input text,
  role_input text default null
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invites i
    where public.normalize_invite_code(i.code) = public.normalize_invite_code(invite_code_input)
      and i.used_at is null
      and (i.expires_at is null or i.expires_at > now())
      and (i.email is null or lower(i.email) = lower(trim(email_input)))
      and (i.role is null or role_input is null or i.role = role_input)
  );
$$;

create or replace function public.user_has_invite_access(user_id_input uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invites i
    where i.used_by = user_id_input
      and i.used_at is not null
  );
$$;

create or replace function public.is_approved_member(user_id_input uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id_input
      and p.member_status = 'approved'
      and coalesce(p.subscription_status, '') in ('active', 'trialing')
  );
$$;

create or replace function public.consume_invite_for_user(
  user_id_input uuid,
  email_input text,
  invite_code_input text,
  role_input text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_id uuid;
begin
  select i.id
    into invite_id
  from public.invites i
  where public.normalize_invite_code(i.code) = public.normalize_invite_code(invite_code_input)
    and i.used_at is null
    and (i.expires_at is null or i.expires_at > now())
    and (i.email is null or lower(i.email) = lower(trim(email_input)))
    and (i.role is null or i.role = role_input)
  order by i.created_at asc
  limit 1
  for update skip locked;

  if invite_id is null then
    raise exception 'Valid invite required.' using errcode = 'P0001';
  end if;

  update public.invites
  set used_by = user_id_input,
      used_at = now(),
      updated_at = now()
  where id = invite_id;

  return invite_id;
end;
$$;

revoke all on public.invites from anon;
revoke all on public.invites from authenticated;
grant execute on function public.is_invite_valid(text, text, text) to anon, authenticated;
grant execute on function public.is_approved_member(uuid) to authenticated;

do $$
begin
  alter table public.profiles
    drop constraint if exists profiles_member_status_check;
  alter table public.profiles
    add constraint profiles_member_status_check
    check (member_status in ('none', 'pending', 'pending_payment', 'approved', 'rejected'));
end
$$;

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('garage-images', 'garage-images', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload profile images" on storage.objects;
create policy "Users can upload profile images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update profile images" on storage.objects;
create policy "Users can update profile images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- World-readable SELECT also made the bucket world-LISTABLE, which enumerated
-- user ids and every uploaded file. Public buckets still serve
-- /object/public/<path> without consulting RLS, so images keep loading.
drop policy if exists "Profile images are publicly readable" on storage.objects;
drop policy if exists "Owners can list their profile-images" on storage.objects;
create policy "Owners can list their profile-images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload garage images" on storage.objects;
create policy "Users can upload garage images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'garage-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update garage images" on storage.objects;
create policy "Users can update garage images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'garage-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'garage-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- World-readable SELECT also made the bucket world-LISTABLE, which enumerated
-- user ids and every uploaded file. Public buckets still serve
-- /object/public/<path> without consulting RLS, so images keep loading.
drop policy if exists "Garage images are publicly readable" on storage.objects;
drop policy if exists "Owners can list their garage-images" on storage.objects;
create policy "Owners can list their garage-images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'garage-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Members can read their own profile" on public.profiles;
create policy "Members can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

-- Contact details unlock once the two sides are actually talking.
drop policy if exists "Conversation counterparties can read contact details" on public.profiles;
create policy "Conversation counterparties can read contact details"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where (c.owner_id = auth.uid() and c.participant_id = profiles.id)
       or (c.participant_id = auth.uid() and c.owner_id = profiles.id)
  )
);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (
  auth.uid() = id
  and public.user_has_invite_access(auth.uid())
);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Names, avatars and badges for the member directory. Deliberately excludes
-- contact_email / phone / website, which stay behind the base table's RLS.
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

  perform public.consume_invite_for_user(
    new.id,
    new.email,
    new.raw_user_meta_data->>'invite_code',
    case when profile_role = 'builder' then 'builder' else 'buyer' end
  );

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
