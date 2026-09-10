-- The paid-membership rollout temporarily normalized approved profiles without
-- active Stripe subscriptions back to pending_payment. Members created before
-- Stripe existed should keep their approved access.
update public.profiles
set
  member_status = 'approved',
  updated_at = now()
where
  member_status = 'pending_payment'
  and created_at < timestamptz '2026-09-01 09:00:00+00'
  and stripe_subscription_id is null
  and subscription_status is null;
