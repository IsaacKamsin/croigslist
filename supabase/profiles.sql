create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  handle text not null,
  city text not null,
  role text not null check (role in ('buyer', 'builder')),
  garage_name text,
  contact_email text,
  phone text,
  website text,
  bio text,
  member_status text not null default 'approved'
    check (member_status in ('none', 'pending', 'approved', 'rejected')),
  is_verified boolean not null default false,
  bikes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

alter table public.profiles add column if not exists garage_name text;
alter table public.profiles add column if not exists contact_email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists website text;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

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
    is_verified
  )
  values (
    new.id,
    profile_name,
    coalesce(nullif(profile_handle, ''), left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'city', ''),
    case when profile_role = 'builder' then 'builder' else 'buyer' end,
    nullif(new.raw_user_meta_data->>'bio', ''),
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
