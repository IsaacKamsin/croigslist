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

-- World-readable SELECT also made the bucket world-LISTABLE, which enumerated
-- user ids and every uploaded file. Public buckets still serve
-- /object/public/<path> without consulting RLS, so images keep loading.
drop policy if exists "Listing images are publicly readable" on storage.objects;
drop policy if exists "Owners can list their listing-images" on storage.objects;
create policy "Owners can list their listing-images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
