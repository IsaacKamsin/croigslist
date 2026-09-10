-- A buyer can have only one pending offer on a listing at a time. Multiple
-- buyers can still make pending offers on the same listing.
with ranked_pending as (
  select
    id,
    row_number() over (
      partition by listing_id, buyer_id
      order by created_at desc, id desc
    ) as pending_rank
  from public.listing_offers
  where status = 'pending'
)
update public.listing_offers lo
set
  status = 'cancelled',
  updated_at = now()
from ranked_pending rp
where lo.id = rp.id
  and rp.pending_rank > 1;

drop index if exists public.one_pending_offer_per_listing;

create unique index if not exists one_pending_offer_per_buyer_listing
on public.listing_offers(listing_id, buyer_id)
where status = 'pending';
