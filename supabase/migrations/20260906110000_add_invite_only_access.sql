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

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (
  auth.uid() = id
  and public.user_has_invite_access(auth.uid())
);

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
