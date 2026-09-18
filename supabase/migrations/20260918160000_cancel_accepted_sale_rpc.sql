create or replace function public.cancel_accepted_listing_sale(
  offer_id_input uuid
)
returns table(listing_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_offer public.listing_offers%rowtype;
begin
  select *
    into target_offer
  from public.listing_offers
  where id = offer_id_input
    and status = 'accepted'
  for update;

  if target_offer.id is null then
    raise exception 'Accepted offer not found.' using errcode = 'P0001';
  end if;

  if auth.uid() is null
    or auth.uid() not in (target_offer.buyer_id, target_offer.seller_id)
    or not public.is_approved_member(auth.uid()) then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  update public.listing_offers
  set
    status = 'cancelled',
    updated_at = now()
  where id = target_offer.id;

  update public.listings
  set
    status = 'active',
    updated_at = now()
  where id = target_offer.listing_id
    and seller_id = target_offer.seller_id;

  return query select target_offer.listing_id;
end;
$$;

revoke all on function public.cancel_accepted_listing_sale(uuid) from public;
grant execute on function public.cancel_accepted_listing_sale(uuid) to authenticated;

notify pgrst, 'reload schema';
