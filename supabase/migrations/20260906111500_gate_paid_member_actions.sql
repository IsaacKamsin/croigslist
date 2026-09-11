create or replace function public.is_approved_member(user_id_input uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id_input
      and p.member_status = 'approved'
      and coalesce(p.subscription_status, '') in ('active', 'trialing')
  );
$$;

grant execute on function public.is_approved_member(uuid) to authenticated;

create or replace view public.public_profiles
with (security_invoker = false) as
select
  id,
  full_name,
  handle,
  city,
  role,
  garage_name,
  garage_image_url,
  avatar_url,
  bio,
  is_verified,
  bikes_count,
  created_at
from public.profiles
where public.is_approved_member(id);

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

drop policy if exists "Shops are readable by authenticated users" on public.shops;
create policy "Shops are readable by authenticated users"
on public.shops for select
to authenticated
using (public.is_approved_member(auth.uid()));

drop policy if exists "Shop owners can manage their shops" on public.shops;
create policy "Shop owners can manage their shops"
on public.shops for all
to authenticated
using (auth.uid() = owner_id and public.is_approved_member(auth.uid()))
with check (auth.uid() = owner_id and public.is_approved_member(auth.uid()));

drop policy if exists "Listings are readable by authenticated users" on public.listings;
create policy "Listings are readable by authenticated users"
on public.listings for select
to authenticated
using (
  public.is_approved_member(auth.uid())
  and status in ('active', 'pending', 'sold')
  and (seller_id is not null or shop_id is not null)
);

drop policy if exists "Sellers can manage their listings" on public.listings;
create policy "Sellers can manage their listings"
on public.listings for all
to authenticated
using (auth.uid() = seller_id and public.is_approved_member(auth.uid()))
with check (auth.uid() = seller_id and public.is_approved_member(auth.uid()));

drop policy if exists "Users can read their conversations" on public.conversations;
create policy "Users can read their conversations"
on public.conversations for select
to authenticated
using (
  (auth.uid() = owner_id or auth.uid() = participant_id)
  and public.is_approved_member(auth.uid())
);

drop policy if exists "Users can create their conversations" on public.conversations;
create policy "Users can create their conversations"
on public.conversations for insert
to authenticated
with check (auth.uid() = owner_id and public.is_approved_member(auth.uid()));

drop policy if exists "Users can update their conversations" on public.conversations;
create policy "Users can update their conversations"
on public.conversations for update
to authenticated
using (
  (auth.uid() = owner_id or auth.uid() = participant_id)
  and public.is_approved_member(auth.uid())
)
with check (
  (auth.uid() = owner_id or auth.uid() = participant_id)
  and public.is_approved_member(auth.uid())
);

drop policy if exists "Users can delete their conversations" on public.conversations;
create policy "Users can delete their conversations"
on public.conversations for delete
to authenticated
using (
  (auth.uid() = owner_id or auth.uid() = participant_id)
  and public.is_approved_member(auth.uid())
);

drop policy if exists "Users can read messages in their conversations" on public.conversation_messages;
create policy "Users can read messages in their conversations"
on public.conversation_messages for select
to authenticated
using (
  public.is_approved_member(auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.owner_id = auth.uid() or c.participant_id = auth.uid())
  )
);

drop policy if exists "Users can send messages in their conversations" on public.conversation_messages;
create policy "Users can send messages in their conversations"
on public.conversation_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_approved_member(auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.owner_id = auth.uid() or c.participant_id = auth.uid())
  )
);

drop policy if exists "Users can delete messages in their conversations" on public.conversation_messages;
create policy "Users can delete messages in their conversations"
on public.conversation_messages for delete
to authenticated
using (
  public.is_approved_member(auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.owner_id = auth.uid() or c.participant_id = auth.uid())
  )
);

drop policy if exists "Offer participants can read offers" on public.listing_offers;
create policy "Offer participants can read offers"
on public.listing_offers for select
to authenticated
using (
  (auth.uid() = buyer_id or auth.uid() = seller_id)
  and public.is_approved_member(auth.uid())
);

drop policy if exists "Buyers can create offers" on public.listing_offers;
create policy "Buyers can create offers"
on public.listing_offers for insert
to authenticated
with check (auth.uid() = buyer_id and public.is_approved_member(auth.uid()));

drop policy if exists "Sellers can update offers" on public.listing_offers;
create policy "Sellers can update offers"
on public.listing_offers for update
to authenticated
using (auth.uid() = seller_id and public.is_approved_member(auth.uid()))
with check (auth.uid() = seller_id and public.is_approved_member(auth.uid()));

drop policy if exists "Buyers can cancel offers" on public.listing_offers;
create policy "Buyers can cancel offers"
on public.listing_offers for update
to authenticated
using (auth.uid() = buyer_id and public.is_approved_member(auth.uid()))
with check (
  auth.uid() = buyer_id
  and status = 'cancelled'
  and public.is_approved_member(auth.uid())
);
