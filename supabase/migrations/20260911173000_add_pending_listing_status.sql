alter table public.listings
  drop constraint if exists listings_status_check;

alter table public.listings
  add constraint listings_status_check
  check (status in ('active', 'pending', 'sold', 'draft'));

drop policy if exists "Listings are readable by authenticated users" on public.listings;
create policy "Listings are readable by authenticated users"
on public.listings for select
to authenticated
using (
  public.is_approved_member(auth.uid())
  and
  status in ('active', 'pending', 'sold')
  and (seller_id is not null or shop_id is not null)
);
