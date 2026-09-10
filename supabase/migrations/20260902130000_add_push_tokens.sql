create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text,
  device_id text,
  enabled boolean not null default true,
  last_registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

drop policy if exists "Users can read their push tokens" on public.push_tokens;
create policy "Users can read their push tokens"
on public.push_tokens for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their push tokens" on public.push_tokens;
create policy "Users can insert their push tokens"
on public.push_tokens for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their push tokens" on public.push_tokens;
create policy "Users can update their push tokens"
on public.push_tokens for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their push tokens" on public.push_tokens;
create policy "Users can delete their push tokens"
on public.push_tokens for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists push_tokens_user_id_idx
on public.push_tokens(user_id);

create index if not exists push_tokens_enabled_idx
on public.push_tokens(enabled)
where enabled = true;
