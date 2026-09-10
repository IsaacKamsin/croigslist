alter table public.profiles
add column if not exists subscription_cancel_at_period_end boolean not null default false;

alter table public.shops
add column if not exists tagline text;

alter table public.shops
add column if not exists verified boolean not null default true;

alter table public.shops
add column if not exists badges text[] not null default '{}';

alter table public.shops
add column if not exists location text;

alter table public.shops
add column if not exists address text;

alter table public.shops
add column if not exists phone text;

alter table public.shops
add column if not exists email text;

alter table public.shops
add column if not exists website text;

alter table public.shops
add column if not exists appointment_only boolean not null default false;

alter table public.shops
add column if not exists build_styles text[] not null default '{}';
