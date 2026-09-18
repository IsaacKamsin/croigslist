create table if not exists public.builder_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  builder_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, builder_id),
  constraint builder_follows_not_self check (follower_id <> builder_id)
);

alter table public.builder_follows enable row level security;

create policy "Anyone can read builder follows"
  on public.builder_follows
  for select
  using (true);

create policy "Users can follow builders"
  on public.builder_follows
  for insert
  to authenticated
  with check (auth.uid() = follower_id and auth.uid() <> builder_id);

create policy "Users can unfollow builders"
  on public.builder_follows
  for delete
  to authenticated
  using (auth.uid() = follower_id);

create index if not exists builder_follows_builder_id_idx
  on public.builder_follows(builder_id);

create index if not exists builder_follows_follower_id_idx
  on public.builder_follows(follower_id);

notify pgrst, 'reload schema';
