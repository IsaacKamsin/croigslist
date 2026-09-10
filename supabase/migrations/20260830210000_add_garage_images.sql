alter table public.profiles
add column if not exists garage_image_url text;

insert into storage.buckets (id, name, public)
values ('garage-images', 'garage-images', true)
on conflict (id) do nothing;

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

drop policy if exists "Garage images are publicly readable" on storage.objects;
create policy "Garage images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'garage-images');
