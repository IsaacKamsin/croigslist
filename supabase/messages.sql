create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  participant_id uuid references auth.users(id) on delete set null,
  participant_name text,
  listing_id uuid references public.listings(id) on delete set null,
  last_message text,
  last_message_at timestamptz default now(),
  unread boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

drop policy if exists "Users can read their conversations" on public.conversations;
create policy "Users can read their conversations"
on public.conversations for select
to authenticated
using (auth.uid() = owner_id or auth.uid() = participant_id);

drop policy if exists "Users can create their conversations" on public.conversations;
create policy "Users can create their conversations"
on public.conversations for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Users can update their conversations" on public.conversations;
create policy "Users can update their conversations"
on public.conversations for update
to authenticated
using (auth.uid() = owner_id or auth.uid() = participant_id)
with check (auth.uid() = owner_id or auth.uid() = participant_id);

drop policy if exists "Users can read messages in their conversations" on public.conversation_messages;
create policy "Users can read messages in their conversations"
on public.conversation_messages for select
to authenticated
using (
  exists (
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
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.owner_id = auth.uid() or c.participant_id = auth.uid())
  )
);
