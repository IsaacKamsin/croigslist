delete from public.listings
where seller_id is null
  and seller_name in (
    'Twin Cities Moto Co.',
    'North Loop Garage',
    'Lake Street Motors',
    'Reincarnation Cycles'
  );

delete from public.shops
where slug in (
  'twin-cities-moto',
  'north-loop-garage',
  'lake-street-motors',
  'reincarnation-cycles'
);

drop policy if exists "Listings are readable by authenticated users" on public.listings;
create policy "Listings are readable by authenticated users"
on public.listings for select
to authenticated
using (
  status in ('active', 'sold')
  and (seller_id is not null or shop_id is not null)
);
