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
  );
$$;

grant execute on function public.is_approved_member(uuid) to authenticated;
