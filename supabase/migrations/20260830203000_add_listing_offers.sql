create table if not exists public.listing_offers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_offers_conversation_id_idx
on public.listing_offers(conversation_id);

create index if not exists listing_offers_listing_id_idx
on public.listing_offers(listing_id);

alter table public.listing_offers enable row level security;

drop policy if exists "Offer participants can read offers" on public.listing_offers;
create policy "Offer participants can read offers"
on public.listing_offers for select
to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Buyers can create offers" on public.listing_offers;
create policy "Buyers can create offers"
on public.listing_offers for insert
to authenticated
with check (auth.uid() = buyer_id);

drop policy if exists "Sellers can update offers" on public.listing_offers;
create policy "Sellers can update offers"
on public.listing_offers for update
to authenticated
using (auth.uid() = seller_id)
with check (auth.uid() = seller_id);
