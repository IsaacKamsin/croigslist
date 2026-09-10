create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  slug text not null unique,
  name text not null,
  specialty text not null default 'Motorcycles',
  builds_count integer not null default 0,
  image_url text,
  tagline text,
  verified boolean not null default true,
  badges text[] not null default '{}',
  location text,
  address text,
  phone text,
  email text,
  website text,
  appointment_only boolean not null default false,
  build_styles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shops add column if not exists tagline text;
alter table public.shops add column if not exists verified boolean not null default true;
alter table public.shops add column if not exists badges text[] not null default '{}';
alter table public.shops add column if not exists location text;
alter table public.shops add column if not exists address text;
alter table public.shops add column if not exists phone text;
alter table public.shops add column if not exists email text;
alter table public.shops add column if not exists website text;
alter table public.shops add column if not exists appointment_only boolean not null default false;
alter table public.shops add column if not exists build_styles text[] not null default '{}';

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete set null,
  shop_id uuid references public.shops(id) on delete set null,
  year integer,
  make text not null,
  model text not null,
  price integer not null default 0,
  mileage text,
  description text,
  condition text,
  location text,
  image_url text,
  image_urls text[] not null default '{}',
  viewer_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'sold', 'draft')),
  is_featured boolean not null default false,
  is_rare boolean not null default false,
  is_project boolean not null default false,
  seller_name text,
  seller_type text,
  seller_verified boolean not null default false,
  seller_member_since text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings add column if not exists image_urls text[] not null default '{}';
alter table public.listings add column if not exists seller_name text;
alter table public.listings add column if not exists seller_type text;
alter table public.listings add column if not exists seller_verified boolean not null default false;
alter table public.listings add column if not exists seller_member_since text;

alter table public.shops enable row level security;
alter table public.listings enable row level security;

drop policy if exists "Shops are readable by authenticated users" on public.shops;
create policy "Shops are readable by authenticated users"
on public.shops for select
to authenticated
using (public.is_approved_member(auth.uid()));

drop policy if exists "Shop owners can manage their shops" on public.shops;
create policy "Shop owners can manage their shops"
on public.shops for all
to authenticated
using (auth.uid() = owner_id and public.is_approved_member(auth.uid()))
with check (auth.uid() = owner_id and public.is_approved_member(auth.uid()));

drop policy if exists "Listings are readable by authenticated users" on public.listings;
create policy "Listings are readable by authenticated users"
on public.listings for select
to authenticated
using (
  public.is_approved_member(auth.uid())
  and
  status in ('active', 'sold')
  and (seller_id is not null or shop_id is not null)
);

drop policy if exists "Sellers can manage their listings" on public.listings;
create policy "Sellers can manage their listings"
on public.listings for all
to authenticated
using (auth.uid() = seller_id and public.is_approved_member(auth.uid()))
with check (auth.uid() = seller_id and public.is_approved_member(auth.uid()));
