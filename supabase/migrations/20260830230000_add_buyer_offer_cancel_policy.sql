-- Buyers could not update their own offers (the only UPDATE policy was seller-only),
-- so "Cancel offer" matched zero rows and returned no error.
drop policy if exists "Buyers can cancel offers" on public.listing_offers;
create policy "Buyers can cancel offers"
on public.listing_offers for update
to authenticated
using (auth.uid() = buyer_id)
with check (auth.uid() = buyer_id and status = 'cancelled');

notify pgrst, 'reload schema';
