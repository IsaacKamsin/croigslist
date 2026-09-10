alter table public.listings
add column if not exists seller_name text,
add column if not exists seller_type text,
add column if not exists seller_verified boolean not null default false,
add column if not exists seller_member_since text;

notify pgrst, 'reload schema';
