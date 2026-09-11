alter table public.conversation_messages
  add column if not exists image_url text,
  add column if not exists image_path text;
