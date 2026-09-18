update public.listings as listing
set
  status = 'active',
  updated_at = now()
where listing.status = 'sold'
  and exists (
    select 1
    from public.listing_offers as offer
    where offer.listing_id = listing.id
  )
  and not exists (
    select 1
    from public.listing_offers as offer
    where offer.listing_id = listing.id
      and offer.status = 'accepted'
  );

create or replace function public.get_accepted_sold_listing_ids()
returns table(listing_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct offer.listing_id
  from public.listing_offers as offer
  join public.listings as listing
    on listing.id = offer.listing_id
  where offer.status = 'accepted'
    and listing.status = 'sold';
$$;

revoke all on function public.get_accepted_sold_listing_ids() from public;
grant execute on function public.get_accepted_sold_listing_ids() to anon;
grant execute on function public.get_accepted_sold_listing_ids() to authenticated;

notify pgrst, 'reload schema';
