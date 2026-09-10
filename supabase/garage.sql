-- Private: garage photos are owner-only, served through signed URLs.
insert into storage.buckets (id, name, public)
values ('garage-bike-images', 'garage-bike-images', false)
on conflict (id) do update set public = excluded.public;

create table if not exists public.garage_bikes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  image_path text,
  brand text,
  model text,
  year_estimate text,
  frame_type text,
  color text,
  condition text,
  vibe text,
  confidence numeric,
  analysis_status text not null default 'pending'
    check (analysis_status in ('pending', 'complete', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.garage_bikes enable row level security;

drop policy if exists "Users can read their garage bikes" on public.garage_bikes;
create policy "Users can read their garage bikes"
on public.garage_bikes for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Users can insert their garage bikes" on public.garage_bikes;
create policy "Users can insert their garage bikes"
on public.garage_bikes for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Users can update their garage bikes" on public.garage_bikes;
create policy "Users can update their garage bikes"
on public.garage_bikes for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can delete their garage bikes" on public.garage_bikes;
create policy "Users can delete their garage bikes"
on public.garage_bikes for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Users can upload garage bike images" on storage.objects;
create policy "Users can upload garage bike images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'garage-bike-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update garage bike images" on storage.objects;
create policy "Users can update garage bike images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'garage-bike-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'garage-bike-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- World-readable SELECT also made the bucket world-LISTABLE, which enumerated
-- user ids and every uploaded file. Public buckets still serve
-- /object/public/<path> without consulting RLS, so images keep loading.
drop policy if exists "Garage bike images are publicly readable" on storage.objects;
drop policy if exists "Owners can list their garage-bike-images" on storage.objects;
create policy "Owners can list their garage-bike-images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'garage-bike-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
