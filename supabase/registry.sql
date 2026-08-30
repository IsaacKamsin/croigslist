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
using (true);

drop policy if exists "Shop owners can manage their shops" on public.shops;
create policy "Shop owners can manage their shops"
on public.shops for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Listings are readable by authenticated users" on public.listings;
create policy "Listings are readable by authenticated users"
on public.listings for select
to authenticated
using (status in ('active', 'sold'));

drop policy if exists "Sellers can manage their listings" on public.listings;
create policy "Sellers can manage their listings"
on public.listings for all
to authenticated
using (auth.uid() = seller_id)
with check (auth.uid() = seller_id);

insert into public.shops (
  slug,
  name,
  specialty,
  builds_count,
  image_url,
  tagline,
  verified,
  badges,
  location,
  address,
  phone,
  email,
  website,
  appointment_only,
  build_styles
)
values
  (
    'twin-cities-moto',
    'Twin Cities Moto Co.',
    'Japanese Classics',
    12,
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&q=80',
    'Vintage Japanese bikes, properly sorted.',
    true,
    array['Japanese Classics', 'Restoration'],
    'Minneapolis, MN',
    'Minneapolis, MN',
    '',
    '',
    '',
    false,
    array['Cafe Racers', 'Standards', 'Restorations']
  ),
  (
    'north-loop-garage',
    'North Loop Garage',
    'Custom Builds',
    8,
    'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80',
    'Custom builds and clean rider-grade machines.',
    true,
    array['Custom Builds'],
    'Minneapolis, MN',
    'North Loop, Minneapolis, MN',
    '',
    '',
    '',
    false,
    array['Trackers', 'Scramblers', 'Custom Builds']
  ),
  (
    'lake-street-motors',
    'Lake Street Motors',
    'Restoration',
    22,
    'https://images.unsplash.com/photo-1622185135505-2d795003994a?w=500&q=80',
    'Restoration work for riders who care about details.',
    true,
    array['Restoration'],
    'Minneapolis, MN',
    'Lake Street, Minneapolis, MN',
    '',
    '',
    '',
    false,
    array['Restorations', 'Vintage Rebuilds']
  ),
  (
    'reincarnation-cycles',
    'Reincarnation Cycles',
    'Vintage Rebuilds',
    15,
    'https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=500&q=80',
    'You dream it, we make it.',
    true,
    array['Custom Builds', 'Vintage Specialist'],
    'Circle Pines, MN',
    '10750 Stutz St NE, Circle Pines, MN 55014',
    '612-568-8141',
    'reincarnationcycles@gmail.com',
    'reincarnationcycles.com',
    true,
    array['Cafe Racers', 'Bobbers', 'Scrambler / Brat']
  )
on conflict (slug) do update set
  name = excluded.name,
  specialty = excluded.specialty,
  builds_count = excluded.builds_count,
  image_url = excluded.image_url,
  tagline = excluded.tagline,
  verified = excluded.verified,
  badges = excluded.badges,
  location = excluded.location,
  address = excluded.address,
  phone = excluded.phone,
  email = excluded.email,
  website = excluded.website,
  appointment_only = excluded.appointment_only,
  build_styles = excluded.build_styles;

insert into public.listings (
  year,
  make,
  model,
  price,
  mileage,
  description,
  condition,
  location,
  image_url,
  image_urls,
  viewer_count,
  status,
  is_featured,
  is_rare,
  is_project,
  seller_name,
  seller_type,
  seller_verified,
  seller_member_since
)
values
  (1969, 'TRIUMPH', 'Bonneville T120', 14500, '18500', 'Featured vintage Triumph with sorted mechanicals and clean presentation.', 'rideable', 'Minneapolis', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&q=80', array['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&q=80'], 7, 'active', true, true, false, 'Twin Cities Moto Co.', 'builder', true, '2025'),
  (1972, 'HONDA', 'CB750', 6800, '23400', 'Clean rider with fresh service and title in hand.', 'rideable', 'Minneapolis', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&q=80', array['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&q=80'], 4, 'active', false, false, false, 'Twin Cities Moto Co.', 'builder', true, '2025'),
  (2019, 'YAMAHA', 'SR400', 4500, '8100', 'Simple standard with tasteful updates.', 'rideable', 'St. Paul', 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80', array['https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80'], 2, 'active', false, false, false, 'North Loop Garage', 'builder', true, '2025'),
  (2020, 'DUCATI', 'Monster', 8200, '6200', 'Modern naked bike, strong runner.', 'rideable', 'Minneapolis', 'https://images.unsplash.com/photo-1622185135505-2d795003994a?w=500&q=80', array['https://images.unsplash.com/photo-1622185135505-2d795003994a?w=500&q=80'], 6, 'active', false, false, false, 'Lake Street Motors', 'builder', true, '2025'),
  (2018, 'BMW', 'R NineT', 11500, '9800', 'Air-cooled boxer with premium parts.', 'rideable', 'Duluth', 'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=500&q=80', array['https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=500&q=80'], 3, 'active', false, false, false, 'North Loop Garage', 'builder', true, '2025'),
  (1975, 'HONDA', 'CB550', 4200, '23400', 'Clean survivor. Carbs rebuilt, new tires, chain, and battery.', 'rideable', 'Minneapolis', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&q=80', array['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&q=80'], 5, 'active', false, false, false, 'Twin Cities Moto Co.', 'builder', true, '2025'),
  (1982, 'YAMAHA', 'XJ650', 3100, '30100', 'Affordable vintage Yamaha rider.', 'rideable', 'Rochester', 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80', array['https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80'], 2, 'active', false, false, false, 'North Loop Garage', 'builder', true, '2025'),
  (1979, 'SUZUKI', 'GS550', 2800, '26100', 'Budget Suzuki standard, good candidate for light sorting.', 'rideable', 'St. Paul', 'https://images.unsplash.com/photo-1595854341625-f2b24f2322e2?w=500&q=80', array['https://images.unsplash.com/photo-1595854341625-f2b24f2322e2?w=500&q=80'], 1, 'active', false, false, false, 'Lake Street Motors', 'builder', true, '2025'),
  (1980, 'HONDA', 'CX500', 1200, '', 'Project CX500 ready for a full plan.', 'project', 'Minneapolis', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&q=80', array['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&q=80'], 3, 'active', false, false, true, 'Reincarnation Cycles', 'builder', true, '2025'),
  (1976, 'KAWASAKI', 'KZ400', 900, '', 'Low-cost project bike.', 'project', 'Duluth', 'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=500&q=80', array['https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=500&q=80'], 1, 'active', false, false, true, 'Reincarnation Cycles', 'builder', true, '2025'),
  (1978, 'SUZUKI', 'GS750', 1800, '', 'GS platform project with potential.', 'project', 'Rochester', 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80', array['https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80'], 2, 'active', false, false, true, 'Reincarnation Cycles', 'builder', true, '2025'),
  (1973, 'BMW', 'R75/5', 9200, '19400', 'Clean toaster tank airhead.', 'rideable', 'Minneapolis', 'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=500&q=80', array['https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=500&q=80'], 5, 'active', false, true, false, 'Twin Cities Moto Co.', 'builder', true, '2025'),
  (1977, 'KAWASAKI', 'KZ650', 3800, '27800', 'Recently sold KZ650.', 'rideable', 'St. Paul', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80', array['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80'], 0, 'sold', false, false, false, 'Lake Street Motors', 'builder', true, '2025')
on conflict do nothing;
