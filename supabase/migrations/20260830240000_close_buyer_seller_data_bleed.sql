-- Closes buyer/seller data bleed found in the full-app audit.
--   1. Storage buckets were world-listable, exposing private garage photos + user ids
--   2. Every authenticated member could read every other member's phone + email
--   3. Either conversation party could reassign the thread to a third party
--   4. Either party could hard-delete a thread, cascading away the offer record
--   5. Members could set their own is_verified / member_status
--   6. listings.seller_verified was self-attested

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Storage: stop enumeration, make the Dream Garage actually private.
--    Public buckets serve /object/public/<path> without consulting RLS, so
--    scoping SELECT to the owner's folder keeps avatars and listing photos
--    loading by URL while shutting off the list API used to enumerate users.
-- ─────────────────────────────────────────────────────────────────────────────

update storage.buckets set public = false where id = 'garage-bike-images';

drop policy if exists "Garage bike images are publicly readable" on storage.objects;
drop policy if exists "Owners can read their garage bike images" on storage.objects;
create policy "Owners can read their garage bike images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'garage-bike-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their garage bike images" on storage.objects;
create policy "Users can delete their garage bike images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'garage-bike-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Listing images are publicly readable" on storage.objects;
drop policy if exists "Owners can list their listing images" on storage.objects;
create policy "Owners can list their listing images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Profile images are publicly readable" on storage.objects;
drop policy if exists "Owners can list their profile images" on storage.objects;
create policy "Owners can list their profile images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Garage images are publicly readable" on storage.objects;
drop policy if exists "Owners can list their garage images" on storage.objects;
create policy "Owners can list their garage images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'garage-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Profiles: contact details are no longer a public directory.
--    The base table now exposes a row only to its owner and to people that
--    owner is actually in a conversation with. Everything the app needs for
--    names, avatars and badges moves to a view with no contact columns.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;

drop policy if exists "Members can read their own profile" on public.profiles;
create policy "Members can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Conversation counterparties can read contact details" on public.profiles;
create policy "Conversation counterparties can read contact details"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where (c.owner_id = auth.uid() and c.participant_id = profiles.id)
       or (c.participant_id = auth.uid() and c.owner_id = profiles.id)
  )
);

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
from public.profiles;

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 + 4. Conversations: nobody gets reassigned, nobody gets erased.
--    "Delete" becomes a per-side hide so the counterparty keeps their copy and
--    listing_offers rows stop cascading away with the thread.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.conversations
add column if not exists hidden_for_owner boolean not null default false,
add column if not exists hidden_for_participant boolean not null default false;

drop policy if exists "Users can delete their conversations" on public.conversations;
drop policy if exists "Users can delete messages in their conversations" on public.conversation_messages;

create or replace function public.enforce_conversation_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'service_role' then return new; end if;

  -- The UPDATE policy passes as long as you are still a party to the row, which
  -- let either side rewrite the other party out of it.
  if new.owner_id is distinct from old.owner_id
    or new.participant_id is distinct from old.participant_id
    or new.listing_id is distinct from old.listing_id then
    raise exception 'Conversation participants cannot be reassigned.';
  end if;

  -- Each side may only hide the thread from themselves.
  if auth.uid() = old.owner_id then
    new.hidden_for_participant := old.hidden_for_participant;
  elsif auth.uid() = old.participant_id then
    new.hidden_for_owner := old.hidden_for_owner;
  else
    new.hidden_for_owner := old.hidden_for_owner;
    new.hidden_for_participant := old.hidden_for_participant;
  end if;

  return new;
end;
$$;

drop trigger if exists conversations_enforce_integrity on public.conversations;
create trigger conversations_enforce_integrity
before update on public.conversations
for each row execute function public.enforce_conversation_integrity();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Profiles: trust fields are not self-service.
--    Silently reverted rather than raised so ordinary profile saves still work.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.protect_profile_trust_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'service_role' then return new; end if;

  new.is_verified := old.is_verified;
  new.member_status := old.member_status;
  return new;
end;
$$;

drop trigger if exists profiles_protect_trust_fields on public.profiles;
create trigger profiles_protect_trust_fields
before update on public.profiles
for each row execute function public.protect_profile_trust_fields();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Listings: seller_verified is derived from the (now protected) profile
--    instead of being whatever the seller typed.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.derive_listing_seller_verified()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'service_role' then return new; end if;

  -- Seeded shop listings carry no seller_id; leave those rows alone.
  if new.seller_id is not null then
    new.seller_verified := coalesce(
      (select p.is_verified from public.profiles p where p.id = new.seller_id),
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists listings_derive_seller_verified on public.listings;
create trigger listings_derive_seller_verified
before insert or update on public.listings
for each row execute function public.derive_listing_seller_verified();

notify pgrst, 'reload schema';
