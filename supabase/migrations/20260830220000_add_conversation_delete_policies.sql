drop policy if exists "Users can delete their conversations" on public.conversations;
create policy "Users can delete their conversations"
on public.conversations for delete
to authenticated
using (auth.uid() = owner_id or auth.uid() = participant_id);

drop policy if exists "Users can delete messages in their conversations" on public.conversation_messages;
create policy "Users can delete messages in their conversations"
on public.conversation_messages for delete
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.owner_id = auth.uid() or c.participant_id = auth.uid())
  )
);

notify pgrst, 'reload schema';
