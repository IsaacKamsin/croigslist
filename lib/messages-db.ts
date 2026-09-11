import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  contentTypeForUri,
  extensionForContentType,
  imageUploadBody,
  type LocalImageData,
} from "@/lib/image-upload";
import { getMessageModerationError } from "@/lib/message-moderation";
import { notifyNewMessage } from "@/lib/notification-events";

export type MessageThread = {
  id: string;
  name: string;
  avatarUrl?: string;
  last: string;
  time: string;
  unread: boolean;
  messageCount: number;
  offerAmount?: number;
  offerStatus?: string;
  offerId?: string;
  offerListingId?: string;
  offerSellerId?: string;
  listingTitle?: string;
  archived: boolean;
};

export type ConversationMessage = {
  id: string;
  text: string;
  imageUrl?: string;
  fromMe: boolean;
  time: string;
  createdAt: string;
};

export type ConversationContext = {
  name: string;
  counterpartyName: string;
  counterpartyAvatarUrl?: string;
  counterpartyRole: "buyer" | "seller";
  buyerName: string;
  sellerName: string;
  listingTitle?: string;
  sellerId?: string;
  buyerId?: string;
};

type ThreadRow = {
  id: string;
  owner_id?: string | null;
  hidden_for_owner?: boolean | null;
  hidden_for_participant?: boolean | null;
  participant_name: string | null;
  participant_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread: boolean | null;
  listing?: ThreadListingRow | ThreadListingRow[] | null;
};

type ThreadListingRow = {
  id: string;
  seller_id: string | null;
  seller_name?: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
};

type ConversationNotificationRow = {
  id: string;
  owner_id: string | null;
  participant_id: string | null;
  participant_name: string | null;
  listing?: ThreadListingRow | ThreadListingRow[] | null;
};

type ConversationLookupRow = {
  id: string;
  participant_id: string | null;
};

type ConversationListingRow = {
  seller_id: string | null;
  seller_name: string | null;
};

type ProfileNameRow = {
  id: string;
  full_name: string | null;
  handle: string | null;
  garage_name?: string | null;
  avatar_url?: string | null;
  garage_image_url?: string | null;
};

type MessageRow = {
  id: string;
  body: string;
  image_url?: string | null;
  image_path?: string | null;
  sender_id: string | null;
  created_at: string;
};

type ThreadOfferRow = {
  id: string;
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: string;
  created_at: string;
};

type ThreadOfferClosure = {
  amount: number;
  status: string;
  createdAt: string;
};

function isMissingMessagesSchema(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "PGRST205" ||
    Boolean(candidate.message?.includes("Could not find the table"))
  );
}

function isDegradableListingEmbed(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42703" ||
    candidate.code === "PGRST200" ||
    Boolean(candidate.message?.includes("seller_name")) ||
    Boolean(candidate.message?.includes("Could not find"))
  );
}

const THREAD_COLUMNS =
  "id, owner_id, participant_name, participant_id, last_message, last_message_at, unread, hidden_for_owner, hidden_for_participant";

const THREAD_COLUMNS_LEGACY =
  "id, owner_id, participant_name, participant_id, last_message, last_message_at, unread";
const MESSAGE_IMAGE_BUCKET = "listing-images";
const MESSAGE_IMAGE_BODY_PREFIX = "[croig-image]";
const MESSAGE_IMAGE_TTL_SECONDS = 60 * 60;

const THREAD_SELECTS = [
  `${THREAD_COLUMNS}, listing:listings(id, seller_id, seller_name, year, make, model)`,
  `${THREAD_COLUMNS}, listing:listings(id, seller_id, year, make, model)`,
  THREAD_COLUMNS,
  // Before the hide columns are deployed.
  `${THREAD_COLUMNS_LEGACY}, listing:listings(id, seller_id, year, make, model)`,
  THREAD_COLUMNS_LEGACY,
];

const CONTEXT_COLUMNS = "id, owner_id, participant_name, participant_id";

const CONTEXT_SELECTS = [
  `${CONTEXT_COLUMNS}, listing:listings(id, seller_id, seller_name, year, make, model)`,
  `${CONTEXT_COLUMNS}, listing:listings(id, seller_id, year, make, model)`,
  CONTEXT_COLUMNS,
];

function isMissingProfileGarageName(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42703" ||
    Boolean(candidate.message?.includes("garage_name")) ||
    Boolean(candidate.message?.includes("Could not find"))
  );
}

function shortTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function listingFromThread(row: ThreadRow) {
  return Array.isArray(row.listing) ? row.listing[0] : row.listing;
}

function titleFromListing(listing?: ThreadListingRow | null) {
  return listing
    ? [listing.year, listing.make, listing.model].filter(Boolean).join(" ")
    : "";
}

function sellerProfileName(profile: ProfileNameRow | undefined, listing?: ThreadListingRow | null) {
  return (
    profile?.garage_name ||
    listing?.seller_name ||
    profile?.full_name ||
    meaningfulHandle(profile?.handle) ||
    ""
  );
}

function buyerProfileName(profile?: ProfileNameRow) {
  return profile?.full_name || meaningfulHandle(profile?.handle) || "";
}

function isGenericBuyerName(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return !normalized || normalized === "buyer" || normalized === "interested buyer";
}

function meaningfulHandle(handle?: string | null) {
  if (!handle) return "";
  return /^[a-f0-9]{8}$/i.test(handle) ? "" : handle;
}

function profileAvatarUrl(profile?: ProfileNameRow) {
  const candidates = [profile?.avatar_url, profile?.garage_image_url];
  // Rows written before uploads were guarded can hold a device-local file:// path,
  // which is meaningless on anyone else's device.
  return candidates.find((url) => url?.startsWith("http")) ?? "";
}

function encodeImageMessageBody(imageUrl: string | null, text: string) {
  if (!imageUrl) return text || "Photo";
  return `${MESSAGE_IMAGE_BODY_PREFIX}${imageUrl}${text ? `\n${text}` : ""}`;
}

function parseImageMessageBody(body: string, imageUrl?: string | null) {
  if (!body.startsWith(MESSAGE_IMAGE_BODY_PREFIX)) {
    return { text: body, imageUrl: imageUrl ?? undefined };
  }

  const withoutPrefix = body.slice(MESSAGE_IMAGE_BODY_PREFIX.length);
  const [encodedUrl = "", ...captionParts] = withoutPrefix.split("\n");
  const caption = captionParts.join("\n").trim();

  return {
    text: caption || "Photo",
    imageUrl: imageUrl ?? (encodedUrl.trim() || undefined),
  };
}

async function signedMessageImageUrls(rows: MessageRow[]) {
  const imagePaths = rows
    .map((row) => row.image_path)
    .filter((path): path is string => Boolean(path));
  const signedUrls = new Map<string, string>();
  if (imagePaths.length === 0) return signedUrls;

  const { data } = await supabase.storage
    .from(MESSAGE_IMAGE_BUCKET)
    .createSignedUrls(imagePaths, MESSAGE_IMAGE_TTL_SECONDS);

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
  }

  return signedUrls;
}

async function uploadMessageImage(
  userId: string,
  conversationId: string,
  uri?: string,
  imageData?: LocalImageData,
) {
  if (!uri) return { imageUrl: null, imagePath: null };

  const contentType = imageData?.mimeType ?? contentTypeForUri(uri);
  const extension = extensionForContentType(contentType);
  const imagePath = `${userId}/${conversationId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;

  const { error } = await supabase.storage
    .from(MESSAGE_IMAGE_BUCKET)
    .upload(imagePath, await imageUploadBody(uri, imageData), {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(MESSAGE_IMAGE_BUCKET).getPublicUrl(imagePath);
  return { imageUrl: data.publicUrl, imagePath };
}

function otherParticipantId(row: ThreadRow, currentUserId?: string) {
  if (!currentUserId) return row.participant_id ?? row.owner_id ?? null;
  if (row.owner_id === currentUserId) return row.participant_id ?? null;
  if (row.participant_id === currentUserId) return row.owner_id ?? null;
  return row.participant_id ?? row.owner_id ?? null;
}

function closureFromOfferBody(body: string, createdAt: string): ThreadOfferClosure | null {
  const match = body.match(/^(Accepted|Declined|Cancelled) offer:\s*\$([\d,]+)/i);
  if (!match) return null;
  return {
    status: match[1].toLowerCase(),
    amount: Number(match[2].replace(/[^\d]/g, "")),
    createdAt,
  };
}

function previewTextForThread(
  lastMessage: string | null,
  offer?: ThreadOfferRow,
) {
  const body = lastMessage?.trim() ?? "";
  if (/^Offer:\s*\$[\d,]+/i.test(body) || /^I want to buy\b.+\bfor\s+\$[\d,]+/i.test(body)) {
    return "Offer sent";
  }
  if (/^Accepted offer:\s*\$[\d,]+/i.test(body)) return "Accepted offer";
  if (/^Declined offer:\s*\$[\d,]+/i.test(body)) return "Declined offer";
  if (/^Cancelled offer:\s*\$[\d,]+/i.test(body)) return "Cancelled offer";
  if (body) return body;
  return offer ? `Offer ${offer.status}` : "";
}

async function fetchProfileNames(profileIds: string[]) {
  const profiles = new Map<string, ProfileNameRow>();
  if (profileIds.length === 0) return profiles;
  const addProfiles = (rows: ProfileNameRow[]) => {
    for (const profile of rows) {
      profiles.set(profile.id, profile);
    }
  };
  const fetchCounterpartyProfiles = async () => {
    const missingIds = profileIds.filter((id) => !profiles.has(id));
    if (missingIds.length === 0) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, handle, garage_name, avatar_url, garage_image_url")
      .in("id", missingIds);

    addProfiles((data ?? []) as ProfileNameRow[]);
  };

  // public_profiles exposes names/avatars for every member but no contact
  // details; the profiles table itself is now readable only by the owner and
  // their conversation counterparties.
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, full_name, handle, garage_name, avatar_url, garage_image_url")
    .in("id", profileIds);

  if (!error) {
    addProfiles((data ?? []) as ProfileNameRow[]);
    await fetchCounterpartyProfiles();
    return profiles;
  }

  if (!isMissingProfileGarageName(error)) {
    await fetchCounterpartyProfiles();
    return profiles;
  }

  const fallback = await supabase
    .from("public_profiles")
    .select("id, full_name, handle")
    .in("id", profileIds);

  addProfiles(
    ((fallback.data ?? []) as ProfileNameRow[]).map((profile) => ({
      ...profile,
      garage_name: null,
    })),
  );
  await fetchCounterpartyProfiles();

  return profiles;
}

// One request for every thread's count, rather than a count query per conversation
// re-issued on each Messages-tab focus.
async function fetchMessageCounts(conversationIds: string[]) {
  const counts = new Map<string, number>();
  if (conversationIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("conversation_messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds);

  if (error) return counts;

  for (const row of (data ?? []) as { conversation_id: string }[]) {
    counts.set(row.conversation_id, (counts.get(row.conversation_id) ?? 0) + 1);
  }

  return counts;
}

async function fetchThreadOffers(conversationIds: string[]) {
  const offers = new Map<string, ThreadOfferRow>();
  if (conversationIds.length === 0) return offers;

  const { data, error } = await supabase
    .from("listing_offers")
    .select("id, conversation_id, listing_id, buyer_id, seller_id, amount, status, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (error) return offers;

  for (const offer of (data ?? []) as ThreadOfferRow[]) {
    if (!offers.has(offer.conversation_id)) {
      offers.set(offer.conversation_id, offer);
    }
  }

  return offers;
}

async function fetchThreadOfferClosures(conversationIds: string[]) {
  const closures = new Map<string, ThreadOfferClosure[]>();
  if (conversationIds.length === 0) return closures;

  const { data, error } = await supabase
    .from("conversation_messages")
    .select("conversation_id, body, created_at")
    .in("conversation_id", conversationIds)
    .or("body.ilike.Accepted offer:%,body.ilike.Declined offer:%,body.ilike.Cancelled offer:%")
    .order("created_at", { ascending: true });

  if (error) return closures;

  for (const row of (data ?? []) as { conversation_id: string; body: string; created_at: string }[]) {
    const closure = closureFromOfferBody(row.body, row.created_at);
    if (!closure) continue;
    const existing = closures.get(row.conversation_id) ?? [];
    closures.set(row.conversation_id, [...existing, closure]);
  }

  return closures;
}

function offerWithMessageClosure(
  offer: ThreadOfferRow | undefined,
  closures: ThreadOfferClosure[] | undefined,
) {
  if (!offer || !closures?.length) return offer;

  const closure = [...closures]
    .reverse()
    .find(
      (item) =>
        item.amount === offer.amount &&
        item.createdAt >= offer.created_at,
    );

  return closure ? { ...offer, status: closure.status } : offer;
}

export async function fetchMessageThreads(
  mailbox: "inbox" | "archived" = "inbox",
): Promise<MessageThread[]> {
  if (!isSupabaseConfigured) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let data: unknown = null;
  let error: unknown = null;

  for (const select of THREAD_SELECTS) {
    const result = await supabase
      .from("conversations")
      .select(select)
      .order("last_message_at", { ascending: false });

    data = result.data as unknown;
    error = result.error;
    if (!error) break;
    if (isMissingMessagesSchema(error)) return [];
    // Retrying the *same* embed after a relationship error just fails again, so
    // each step drops more of it; the last select has no embed at all.
    if (!isDegradableListingEmbed(error)) break;
  }

  if (error) {
    if (isMissingMessagesSchema(error)) return [];
    throw error;
  }
  let rows = ((data ?? []) as ThreadRow[]).filter((row) => {
    const archived =
      (row.owner_id === user?.id && row.hidden_for_owner) ||
      (row.participant_id === user?.id && row.hidden_for_participant);
    return mailbox === "archived" ? archived : !archived;
  });
  const messageCounts = await fetchMessageCounts(rows.map((row) => row.id));
  const threadOffers = await fetchThreadOffers(rows.map((row) => row.id));
  const threadOfferClosures = await fetchThreadOfferClosures(rows.map((row) => row.id));
  rows = rows.filter((row) => {
    const hasMessages = (messageCounts.get(row.id) ?? 0) > 0;
    const hasOffer = threadOffers.has(row.id);
    return hasMessages || hasOffer;
  });
  const profileIds = Array.from(
    new Set(
      rows
        .flatMap((row) => {
          const threadOffer = threadOffers.get(row.id);
          return [
            row.owner_id,
            row.participant_id,
            otherParticipantId(row, user?.id),
            listingFromThread(row)?.seller_id,
            threadOffer?.buyer_id,
            threadOffer?.seller_id,
          ];
        })
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const profiles = await fetchProfileNames(profileIds);

  return rows.map((row) => {
    const listing = listingFromThread(row);
    const threadOffer = offerWithMessageClosure(
      threadOffers.get(row.id),
      threadOfferClosures.get(row.id),
    );
    const sellerId = listing?.seller_id ?? threadOffer?.seller_id ?? row.participant_id ?? null;
    const counterpartyId = otherParticipantId(row, user?.id);
    const buyerId =
      threadOffer?.buyer_id ??
      (counterpartyId && counterpartyId !== sellerId ? counterpartyId : null) ??
      (row.participant_id && row.participant_id !== sellerId ? row.participant_id : null);
    const sellerName =
      sellerProfileName(profiles.get(sellerId ?? ""), listing) ||
      (row.participant_name !== "Seller" ? row.participant_name ?? "" : "") ||
      "Seller";
    const buyerName =
      buyerProfileName(profiles.get(buyerId ?? "")) ||
      (row.participant_name &&
      row.participant_name !== sellerName &&
      !isGenericBuyerName(row.participant_name)
        ? row.participant_name
        : "") ||
      "Interested buyer";
    const viewingAsSeller = Boolean(user?.id && sellerId === user.id);
    const counterpartyProfile = profiles.get(counterpartyId ?? "");
    const resolvedName =
      (counterpartyId === buyerId
        ? buyerName
        : counterpartyId === sellerId
          ? sellerName
          : "") ||
      (viewingAsSeller ? buyerName : sellerName);

    return {
      id: row.id,
      name: resolvedName,
      avatarUrl: profileAvatarUrl(counterpartyProfile) || undefined,
      last: previewTextForThread(row.last_message, threadOffer),
      time: shortTime(row.last_message_at),
      unread: Boolean(row.unread),
      messageCount: messageCounts.get(row.id) ?? 0,
      offerAmount: threadOffer?.amount,
      offerStatus: threadOffer?.status,
      offerId: threadOffer?.id,
      offerListingId: threadOffer?.listing_id,
      offerSellerId: threadOffer?.seller_id,
      listingTitle: titleFromListing(listing) || undefined,
      archived:
        (row.owner_id === user?.id && Boolean(row.hidden_for_owner)) ||
        (row.participant_id === user?.id && Boolean(row.hidden_for_participant)),
    };
  });
}

export async function fetchConversationContext(
  conversationId: string,
): Promise<ConversationContext | null> {
  if (!isSupabaseConfigured) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let data: ThreadRow | null = null;
  let error: unknown = null;

  for (const select of CONTEXT_SELECTS) {
    const result = await supabase
      .from("conversations")
      .select(select)
      .eq("id", conversationId)
      .maybeSingle<ThreadRow>();

    data = result.data;
    error = result.error;
    if (!error) break;
    if (isMissingMessagesSchema(error)) return null;
    if (!isDegradableListingEmbed(error)) break;
  }

  if (error) {
    if (isMissingMessagesSchema(error)) return null;
    throw error;
  }
  if (!data) return null;

  const listing = listingFromThread(data);
  const sellerId = listing?.seller_id ?? data.participant_id ?? null;
  const counterpartyId = otherParticipantId(data, user?.id);
  const buyerId =
    counterpartyId && counterpartyId !== sellerId
      ? counterpartyId
      : data.owner_id && data.owner_id !== sellerId
        ? data.owner_id
        : null;
  const profileIds = Array.from(
    new Set([sellerId, buyerId, data.participant_id, counterpartyId].filter((value): value is string => Boolean(value))),
  );
  const profiles = await fetchProfileNames(profileIds);

  const sellerName =
    sellerProfileName(profiles.get(sellerId ?? ""), listing) ||
    data.participant_name ||
    "Seller";
  const buyerName =
    buyerProfileName(profiles.get(buyerId ?? "")) ||
    (data.participant_name &&
    data.participant_name !== sellerName &&
    !isGenericBuyerName(data.participant_name)
      ? data.participant_name
      : "") ||
    "Buyer";
  const viewingAsSeller = Boolean(user?.id && sellerId === user.id);
  const counterpartyName =
    (counterpartyId === buyerId
      ? buyerName
      : counterpartyId === sellerId
        ? sellerName
        : "") ||
    (viewingAsSeller ? buyerName : sellerName);
  const counterpartyProfile = profiles.get(counterpartyId ?? "");

  return {
    name: counterpartyName,
    counterpartyName,
    counterpartyAvatarUrl: profileAvatarUrl(counterpartyProfile) || undefined,
    counterpartyRole: viewingAsSeller ? "buyer" : "seller",
    buyerName,
    sellerName,
    listingTitle: titleFromListing(listing) || undefined,
    sellerId: sellerId ?? undefined,
    buyerId: buyerId ?? undefined,
  };
}

export async function fetchConversationMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  if (!isSupabaseConfigured) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let data: MessageRow[] | null = null;
  let error: unknown = null;
  const withImages = await supabase
    .from("conversation_messages")
    .select("id, body, image_url, image_path, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (withImages.error && isDegradableListingEmbed(withImages.error)) {
    const legacy = await supabase
      .from("conversation_messages")
      .select("id, body, sender_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    data = (legacy.data ?? []) as MessageRow[];
    error = legacy.error;
  } else {
    data = (withImages.data ?? []) as MessageRow[];
    error = withImages.error;
  }

  if (error) {
    if (isMissingMessagesSchema(error)) return [];
    throw error;
  }
  const imageUrls = await signedMessageImageUrls(data ?? []);
  return ((data ?? []) as MessageRow[]).map((row) => ({
    ...(() => {
      const parsed = parseImageMessageBody(
        row.body,
        row.image_path
          ? imageUrls.get(row.image_path) ?? row.image_url
          : row.image_url,
      );

      return {
        id: row.id,
        text: parsed.text,
        imageUrl: parsed.imageUrl,
        fromMe: Boolean(user?.id && row.sender_id === user.id),
        time: shortTime(row.created_at),
        createdAt: row.created_at,
      };
    })(),
  }));
}

export async function startConversation({
  participantId,
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

  const { data: listingParticipant } = listingId
    ? await supabase
        .from("listings")
        .select("seller_id, seller_name")
        .eq("id", listingId)
        .maybeSingle<ConversationListingRow>()
    : { data: null };

  // conversations.participant_id is a FK to auth.users, but a listing's "sellerId"
  // can be a shop id (registry-db falls back to shop_id). Passing one of those
  // violated the FK, and the old catch-all retry then created the thread with a
  // null participant. For listing conversations, trust listings.seller_id because
  // that column is the auth user FK; directory visibility should not decide
  // whether the seller can receive/read the thread.
  const listingParticipantId = listingParticipant?.seller_id ?? null;
  const profileLookupId = listingParticipantId ?? participantId;
  const participantProfile = profileLookupId
    ? (await fetchProfileNames([profileLookupId])).get(profileLookupId)
    : undefined;
  const linkedParticipantId = listingParticipantId
    ? listingParticipantId
    : participantProfile
      ? participantId ?? null
      : null;
  const fallbackParticipantName =
    listingParticipant?.seller_name || participantName;
  const resolvedParticipantName =
    (!fallbackParticipantName || fallbackParticipantName === "Seller"
      ? participantProfile?.garage_name ||
        participantProfile?.full_name ||
        participantProfile?.handle
      : fallbackParticipantName) ||
    fallbackParticipantName ||
    "Seller";

  if (listingId && !linkedParticipantId) {
    throw new Error("This listing is not attached to a seller account.");
  }

  // Dedupe on identity, not on the display name: threads created before the name
  // could be resolved are stored as "Seller", so matching on the resolved name
  // missed them and opened a second thread for the same listing.
  let query = supabase
    .from("conversations")
    .select("id, participant_id")
    .eq("owner_id", user.id)
    .limit(1);

  if (listingId) {
    query = query.eq("listing_id", listingId);
  } else if (linkedParticipantId) {
    query = query.eq("participant_id", linkedParticipantId).is("listing_id", null);
  } else {
    query = query.eq("participant_name", resolvedParticipantName).is("listing_id", null);
  }

  const { data: existing, error: existingError } = await query;
  if (existingError) {
    if (isMissingMessagesSchema(existingError)) {
      return listingId ?? "messages-unavailable";
    }
    throw existingError;
  }
  const existingConversation = existing?.[0] as ConversationLookupRow | undefined;
  if (existingConversation?.id) {
    if (linkedParticipantId && existingConversation.participant_id !== linkedParticipantId) {
      await supabase
        .from("conversations")
        .update({
          participant_id: linkedParticipantId,
          participant_name: resolvedParticipantName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConversation.id);
    }
    return existingConversation.id;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      owner_id: user.id,
      participant_id: linkedParticipantId,
      participant_name: resolvedParticipantName,
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

// A hard delete cascaded through listing_offers, letting either side erase the
// offer record and the counterparty's copy of the negotiation. Each side now
// hides its own view of the thread; the row and its offers survive.
export async function deleteConversation(conversationId: string) {
  return setConversationArchived(conversationId, true);
}

export async function restoreConversation(conversationId: string) {
  return setConversationArchived(conversationId, false);
}

export async function markConversationRead(conversationId: string) {
  if (!isSupabaseConfigured) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return;

  const { data: conversation, error: lookupError } = await supabase
    .from("conversations")
    .select("id, owner_id, participant_id")
    .eq("id", conversationId)
    .maybeSingle<{ id: string; owner_id: string | null; participant_id: string | null }>();

  if (lookupError) {
    if (isMissingMessagesSchema(lookupError)) return;
    throw lookupError;
  }
  if (!conversation) return;
  if (conversation.owner_id !== user.id && conversation.participant_id !== user.id) return;

  const { error } = await supabase
    .from("conversations")
    .update({ unread: false })
    .eq("id", conversationId);

  if (error && !isMissingMessagesSchema(error)) throw error;
}

async function setConversationArchived(conversationId: string, archived: boolean) {
  if (!isSupabaseConfigured) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");

  const { data: conversation, error: lookupError } = await supabase
    .from("conversations")
    .select("id, owner_id, participant_id")
    .eq("id", conversationId)
    .maybeSingle<{ id: string; owner_id: string | null; participant_id: string | null }>();

  if (lookupError) {
    if (isMissingMessagesSchema(lookupError)) return;
    throw lookupError;
  }
  if (!conversation) return;

  const isOwner = conversation.owner_id === user.id;
  const isParticipant = conversation.participant_id === user.id;
  if (!isOwner && !isParticipant) {
    throw new Error("You are not part of this conversation.");
  }

  const { data: updated, error } = await supabase
    .from("conversations")
    .update(
      isOwner ? { hidden_for_owner: archived } : { hidden_for_participant: archived },
    )
    .eq("id", conversationId)
    .select("id");

  if (error) {
    if (isMissingMessagesSchema(error)) return;
    throw error;
  }
  if (!updated?.length) {
    throw new Error(
      archived
        ? "Could not archive this conversation. Try again."
        : "Could not restore this conversation. Try again.",
    );
  }
}

export async function sendConversationMessage(
  conversationId: string,
  body: string,
  options: {
    notify?: boolean;
    moderate?: boolean;
    imageUri?: string;
    imageData?: LocalImageData;
  } = {},
) {
  if (!isSupabaseConfigured) return;
  const cleanBody = body.trim();
  const shouldModerate = options.moderate !== false;
  const moderationError = shouldModerate ? getMessageModerationError(cleanBody) : null;
  if (moderationError) throw new Error(moderationError);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");
  const shouldNotify = options.notify !== false;
  const { imageUrl, imagePath } = await uploadMessageImage(
    user.id,
    conversationId,
    options.imageUri,
    options.imageData,
  );
  const messageBody = cleanBody || (imagePath ? "Photo" : "");
  if (!messageBody) return;
  const fallbackBody = encodeImageMessageBody(imageUrl, cleanBody);

  const { data: conversation } = shouldNotify
    ? await supabase
        .from("conversations")
        .select("id, owner_id, participant_id, participant_name, listing:listings(id, seller_id, seller_name, year, make, model)")
        .eq("id", conversationId)
        .maybeSingle<ConversationNotificationRow>()
    : { data: null };

  const insertPayload = {
    conversation_id: conversationId,
    sender_id: user.id,
    body: messageBody,
    image_url: imageUrl,
    image_path: imagePath,
  };
  const { error: insertError } = await supabase
    .from("conversation_messages")
    .insert(insertPayload);

  const error =
    insertError && isDegradableListingEmbed(insertError) && imageUrl
      ? (
          await supabase.from("conversation_messages").insert({
            conversation_id: conversationId,
            sender_id: user.id,
            body: fallbackBody,
          })
        ).error
      : insertError;

  if (error) {
    if (isMissingMessagesSchema(error)) {
      throw new Error("Messages are not set up yet.");
    }
    throw error;
  }

  const archiveReset =
    conversation?.owner_id === user.id
      ? { hidden_for_participant: false }
      : conversation
        ? { hidden_for_owner: false }
        : {};

  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      last_message: messageBody,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread: true,
      ...archiveReset,
    })
    .eq("id", conversationId);

  if (updateError && !isMissingMessagesSchema(updateError)) throw updateError;

  if (shouldNotify && conversation) {
    const isOwner = conversation.owner_id === user.id;
    const recipientUserId = isOwner
      ? conversation.participant_id
      : conversation.owner_id;
    const listing = Array.isArray(conversation.listing)
      ? conversation.listing[0]
      : conversation.listing;
    const listingTitle = listing
      ? [listing.year, listing.make, listing.model].filter(Boolean).join(" ")
      : undefined;

    if (recipientUserId) {
      notifyNewMessage({
        conversationId,
        recipientUserId,
        senderName: user.user_metadata?.name || user.email?.split("@")[0],
        listingTitle,
        body: imagePath ? "Photo" : messageBody,
      }).catch(() => undefined);
    }
  }
}
