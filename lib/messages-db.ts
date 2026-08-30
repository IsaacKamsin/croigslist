import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type MessageThread = {
  id: string;
  name: string;
  last: string;
  time: string;
  unread: boolean;
};

export type ConversationMessage = {
  id: string;
  text: string;
  fromMe: boolean;
  time: string;
};

type ThreadRow = {
  id: string;
  participant_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread: boolean | null;
};

type MessageRow = {
  id: string;
  body: string;
  sender_id: string | null;
  created_at: string;
};

function isMissingMessagesSchema(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "PGRST205" ||
    Boolean(candidate.message?.includes("Could not find the table"))
  );
}

function shortTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export async function fetchMessageThreads(): Promise<MessageThread[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select("id, participant_name, last_message, last_message_at, unread")
    .order("last_message_at", { ascending: false });

  if (error) {
    if (isMissingMessagesSchema(error)) return [];
    throw error;
  }
  return ((data ?? []) as ThreadRow[]).map((row) => ({
    id: row.id,
    name: row.participant_name ?? "Member",
    last: row.last_message ?? "",
    time: shortTime(row.last_message_at),
    unread: Boolean(row.unread),
  }));
}

export async function fetchConversationMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  if (!isSupabaseConfigured) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id, body, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingMessagesSchema(error)) return [];
    throw error;
  }
  return ((data ?? []) as MessageRow[]).map((row) => ({
    id: row.id,
    text: row.body,
    fromMe: Boolean(user?.id && row.sender_id === user.id),
    time: shortTime(row.created_at),
  }));
}

export async function startConversation({
  participantName,
  listingId,
}: {
  participantId?: string;
  participantName: string;
  listingId?: string;
}) {
  if (!isSupabaseConfigured) return listingId ?? "local";

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");

  let query = supabase
    .from("conversations")
    .select("id")
    .eq("owner_id", user.id)
    .eq("participant_name", participantName)
    .limit(1);

  if (listingId) query = query.eq("listing_id", listingId);

  const { data: existing, error: existingError } = await query;
  if (existingError) {
    if (isMissingMessagesSchema(existingError)) {
      return listingId ?? "messages-unavailable";
    }
    throw existingError;
  }
  if (existing?.[0]?.id) return existing[0].id as string;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      owner_id: user.id,
      participant_id: null,
      participant_name: participantName,
      listing_id: listingId ?? null,
      last_message_at: new Date().toISOString(),
      unread: false,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    if (isMissingMessagesSchema(error)) {
      return listingId ?? "messages-unavailable";
    }
    throw error;
  }
  return data.id;
}

export async function sendConversationMessage(
  conversationId: string,
  body: string,
) {
  if (!isSupabaseConfigured) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");

  const { error } = await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });

  if (error) {
    if (isMissingMessagesSchema(error)) {
      throw new Error("Messages are not set up yet.");
    }
    throw error;
  }

  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      last_message: body,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (updateError && !isMissingMessagesSchema(updateError)) throw updateError;
}
