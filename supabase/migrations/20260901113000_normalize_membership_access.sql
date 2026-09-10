update public.profiles
set
  member_status = 'pending_payment',
  updated_at = now()
where
  member_status = 'approved'
  and coalesce(subscription_status, '') not in ('active', 'trialing');
