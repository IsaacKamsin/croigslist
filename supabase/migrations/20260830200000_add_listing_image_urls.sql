alter table public.listings
add column if not exists image_urls text[] not null default '{}';

notify pgrst, 'reload schema';
