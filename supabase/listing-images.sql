insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users can upload listing images" on storage.objects;
create policy "Users can upload listing images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update listing images" on storage.objects;
create policy "Users can update listing images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Listing images are publicly readable" on storage.objects;
create policy "Listing images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'listing-images');
