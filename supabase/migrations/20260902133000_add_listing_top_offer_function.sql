create or replace function public.get_listing_top_offer(listing_id_input uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select max(amount)::integer
  from public.listing_offers
  where listing_id = listing_id_input
    and status in ('pending', 'accepted');
$$;

revoke all on function public.get_listing_top_offer(uuid) from public;
grant execute on function public.get_listing_top_offer(uuid) to authenticated;
