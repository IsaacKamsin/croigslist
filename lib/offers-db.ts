import { createId } from "@/lib/ids";
import { sendConversationMessage } from "@/lib/messages-db";
import {
  notifyOfferAccepted,
  notifyOfferDeclined,
  notifyOfferReceived,
  notifyPickupNextStep,
  notifySoldListing,
} from "@/lib/notification-events";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type OfferStatus = "pending" | "accepted" | "declined" | "cancelled";

export type ListingOffer = {
  id: string;
  conversationId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: OfferStatus;
  createdAt: string;
  listingTitle?: string;
  listingImage?: string;
  buyerName?: string;
  responseReason?: string;
};

type OfferRow = {
  id: string;
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: OfferStatus;
  created_at: string;
  listing?: OfferListingRow | OfferListingRow[] | null;
};

type OfferListingRow = {
  year: number | null;
  make: string | null;
  model: string | null;
  image_url: string | null;
};

type OfferBuyerRow = {
  id: string;
  full_name: string | null;
  handle: string | null;
};

type CurrentUserProfileRow = {
  full_name: string | null;
  handle: string | null;
};

type OfferMessageRow = {
  id: string;
  body: string;
  sender_id: string | null;
  created_at: string;
};

type OfferConversationRow = {
  id: string;
  owner_id: string;
  participant_id: string | null;
  participant_name: string | null;
  listing_id: string | null;
  listing?: (OfferListingRow & { id: string; seller_id: string | null }) | (OfferListingRow & { id: string; seller_id: string | null })[] | null;
  messages?: OfferMessageRow[] | null;
};

type OfferProfileRow = {
  id: string;
  full_name: string | null;
  handle: string | null;
  garage_name?: string | null;
};

function listingFromOffer(row: OfferRow) {
  return Array.isArray(row.listing) ? row.listing[0] : row.listing;
}

function listingFromConversation(row: OfferConversationRow) {
  return Array.isArray(row.listing) ? row.listing[0] : row.listing;
}

function amountFromOfferMessage(body: string) {
  const match = body.match(/\$([\d,]+)/);
  return match ? Number(match[1].replace(/[^\d]/g, "")) : 0;
}

function isOfferMessage(body: string) {
  return /^Offer:\s*\$[\d,]+/i.test(body) || /^I want to buy\b.+\bfor\s+\$[\d,]+/i.test(body);
}

function closedOfferFromMessage(body: string) {
  const match = body.match(/^(Accepted|Declined|Cancelled) offer:\s*\$([\d,]+)\.?\s*(.*)$/i);
  if (!match) return null;
  const status = match[1].toLowerCase();
  return {
    status:
      status === "accepted"
        ? "accepted"
        : status === "cancelled"
          ? "cancelled"
          : "declined",
    amount: Number(match[2].replace(/[^\d]/g, "")),
    reason: match[3]?.trim() || undefined,
  } as const;
}

function offerFromRow(row: OfferRow): ListingOffer {
  const listing = listingFromOffer(row);
  const listingTitle = listing
    ? [listing.year, listing.make, listing.model].filter(Boolean).join(" ")
    : undefined;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at,
    listingTitle,
    listingImage: listing?.image_url ?? undefined,
  };
}

// Only a genuinely undeployed table counts as "fall back to message-derived offers".
// Broader matching here (42703/22P02/23503, or any message naming the table) also
// swallowed FK violations and RLS denials, reporting failed writes as success.
function isMissingOffersSchema(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "PGRST205" ||
    Boolean(candidate.message?.includes("Could not find the table"))
  );
}

function isPendingOfferConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "23505" ||
    Boolean(candidate.message?.includes("one_pending_offer_per_buyer_listing"))
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export type OfferClosure = {
  amount: number;
  status: OfferStatus;
  reason?: string;
  createdAt: string;
};

export function buildOfferClosures(
  messages: { body: string; created_at: string }[],
): OfferClosure[] {
  const closures: OfferClosure[] = [];

  for (const message of messages) {
    const closed = closedOfferFromMessage(message.body);
    if (!closed?.amount) continue;
    closures.push({
      amount: closed.amount,
      status: closed.status,
      reason: closed.reason,
      createdAt: message.created_at,
    });
  }

  return closures.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// A closing message only closes an offer that came before it, and closes exactly one.
// Keying on amount alone made a re-offer of a previously declined amount render as
// already declined, with no Accept/Deny controls.
export function applyOfferClosures<T extends { amount: number; createdAt: string; status: OfferStatus; responseReason?: string }>(
  offers: T[],
  closures: OfferClosure[],
): T[] {
  const consumed = new Set<number>();
  const ordered = [...offers].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const resolved = new Map<T, T>();

  for (const offer of ordered) {
    const index = closures.findIndex(
      (closure, closureIndex) =>
        !consumed.has(closureIndex) &&
        closure.amount === offer.amount &&
        closure.createdAt >= offer.createdAt,
    );

    if (index === -1) continue;
    consumed.add(index);
    const closure = closures[index];
    resolved.set(offer, {
      ...offer,
      status: closure.status,
      responseReason: closure.reason ?? offer.responseReason,
    });
  }

  return offers.map((offer) => resolved.get(offer) ?? offer);
}

export function normalizePendingOffers<T extends ListingOffer>(offers: T[]): T[] {
  const pendingByBuyerListing = new Map<string, T[]>();

  for (const offer of offers) {
    if (offer.status !== "pending") continue;
    const key = `${offer.listingId}:${offer.buyerId}`;
    const pending = pendingByBuyerListing.get(key) ?? [];
    pendingByBuyerListing.set(key, [...pending, offer]);
  }

  const supersededOfferIds = new Set<string>();
  for (const pending of pendingByBuyerListing.values()) {
    if (pending.length <= 1) continue;
    const older = [...pending]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(1);
    for (const offer of older) {
      supersededOfferIds.add(offer.id);
    }
  }

  if (supersededOfferIds.size === 0) return offers;

  return offers.map((offer) =>
    supersededOfferIds.has(offer.id)
      ? {
          ...offer,
          status: "cancelled",
          responseReason: "A newer pending offer replaced this one.",
        }
      : offer,
  );
}

export async function createListingOffer({
  conversationId,
  listingId,
  sellerId,
  amount,
}: {
  conversationId: string;
  listingId: string;
  sellerId?: string;
  amount: number;
}): Promise<ListingOffer | null> {
  if (!isSupabaseConfigured || !sellerId) {
    return {
      id: createId(),
      conversationId,
      listingId,
      buyerId: "local",
      sellerId: sellerId ?? "seller",
      amount,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");

  const { data: existingPending, error: existingPendingError } = await supabase
    .from("listing_offers")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .eq("status", "pending")
    .limit(1);

  if (existingPendingError) {
    if (isMissingOffersSchema(existingPendingError)) return null;
    throw existingPendingError;
  }
  if (existingPending?.length) {
    throw new Error("You already have a pending offer on this bike.");
  }

  const { data, error } = await supabase
    .from("listing_offers")
    .insert({
      conversation_id: conversationId,
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: sellerId,
      amount,
    })
    .select("id, conversation_id, listing_id, buyer_id, seller_id, amount, status, created_at, listing:listings(year, make, model, image_url)")
    .single<OfferRow>();

  if (error) {
    if (isMissingOffersSchema(error)) return null;
    if (isPendingOfferConflict(error)) {
      throw new Error("You already have a pending offer on this bike.");
    }
    throw error;
  }

  const offer = offerFromRow(data);
  const { data: buyerProfile } = await supabase
    .from("public_profiles")
    .select("full_name, handle")
    .eq("id", user.id)
    .maybeSingle<CurrentUserProfileRow>();

  await notifyOfferReceived({
    offerId: offer.id,
    recipientUserId: sellerId,
    buyerName: buyerProfile?.full_name || buyerProfile?.handle || "A buyer",
    listingTitle: offer.listingTitle,
    amount,
  });

  return offer;
}

export async function fetchConversationOffers(
  conversationId: string,
): Promise<ListingOffer[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("listing_offers")
    .select("id, conversation_id, listing_id, buyer_id, seller_id, amount, status, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingOffersSchema(error)) return fetchConversationOfferMessages(conversationId);
    throw error;
  }

  const structuredOffers = ((data ?? []) as OfferRow[]).map(offerFromRow);
  const messageOffers = await fetchConversationOfferMessages(conversationId);
  return normalizePendingOffers(mergeOffers(structuredOffers, messageOffers));
}

export async function fetchListingTopOffer(listingId?: string): Promise<number | null> {
  if (!isSupabaseConfigured || !listingId) return null;

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_listing_top_offer",
    { listing_id_input: listingId },
  );

  if (!rpcError) {
    const amount = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    return typeof amount === "number" && amount > 0 ? amount : null;
  }

  const { data, error } = await supabase
    .from("listing_offers")
    .select("amount")
    .eq("listing_id", listingId)
    .in("status", ["pending", "accepted"])
    .order("amount", { ascending: false })
    .limit(1)
    .maybeSingle<{ amount: number }>();

  if (error) {
    if (isMissingOffersSchema(error)) return null;
    return null;
  }

  return data?.amount && data.amount > 0 ? data.amount : null;
}

export async function fetchMyPendingOfferForListing(
  listingId?: string,
): Promise<ListingOffer | null> {
  if (!isSupabaseConfigured || !listingId) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("listing_offers")
    .select("id, conversation_id, listing_id, buyer_id, seller_id, amount, status, created_at, listing:listings(year, make, model, image_url)")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<OfferRow>();

  if (error) {
    if (isMissingOffersSchema(error)) return null;
    throw error;
  }

  return data ? offerFromRow(data) : null;
}

export async function fetchSellerOffers(): Promise<ListingOffer[]> {
  if (!isSupabaseConfigured) return [];

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return [];

  const { data, error } = await supabase
    .from("listing_offers")
    .select("id, conversation_id, listing_id, buyer_id, seller_id, amount, status, created_at, listing:listings(year, make, model, image_url)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingOffersSchema(error)) return fetchSellerOfferMessages(user.id);
    throw error;
  }

  const offers = ((data ?? []) as unknown as OfferRow[]).map(offerFromRow);
  const messageOffers = await fetchSellerOfferMessages(user.id);
  const combinedOffers = normalizePendingOffers(mergeOffers(offers, messageOffers));
  const buyerIds = Array.from(new Set(combinedOffers.map((offer) => offer.buyerId)));

  if (buyerIds.length === 0) return combinedOffers;

  const { data: buyers } = await supabase
    .from("public_profiles")
    .select("id, full_name, handle")
    .in("id", buyerIds);
  const buyerNames = new Map(
    ((buyers ?? []) as OfferBuyerRow[]).map((buyer) => [
      buyer.id,
      buyer.full_name || buyer.handle || "Buyer",
    ]),
  );

  return combinedOffers.map((offer) => ({
    ...offer,
    buyerName: buyerNames.get(offer.buyerId) ?? "Buyer",
  }));
}

async function fetchSellerOfferMessages(userId: string): Promise<ListingOffer[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, owner_id, participant_id, participant_name, listing_id, listing:listings(id, seller_id, year, make, model, image_url), messages:conversation_messages(id, body, sender_id, created_at)")
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error) return [];

  const rows = (data ?? []) as unknown as OfferConversationRow[];

  return rows.flatMap((row) => {
    const listing = listingFromConversation(row);
    const isSellerConversation =
      row.participant_id === userId ||
      listing?.seller_id === userId;

    if (!isSellerConversation) return [];

    const messages = [...(row.messages ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const closures = buildOfferClosures(messages);
    const offerMessages = messages.filter((message) => isOfferMessage(message.body));
    if (offerMessages.length === 0) return [];

    const fallbackOffers: ListingOffer[] = [];

    for (const message of offerMessages) {
      const amount = amountFromOfferMessage(message.body);
      if (!amount) continue;

      fallbackOffers.push({
        id: `message-offer-${message.id}`,
        conversationId: row.id,
        listingId: row.listing_id ?? listing?.id ?? row.id,
        buyerId: message.sender_id ?? row.owner_id,
        sellerId: listing?.seller_id ?? row.participant_id ?? userId,
        amount,
        status: "pending",
        createdAt: message.created_at,
        listingTitle: listing
          ? [listing.year, listing.make, listing.model].filter(Boolean).join(" ")
          : "Listing conversation",
        listingImage: listing?.image_url ?? undefined,
        buyerName: row.participant_name && row.participant_name !== "Seller" ? row.participant_name : "Buyer",
      });
    }

    return applyOfferClosures(fallbackOffers, closures);
  });
}

async function fetchConversationOfferMessages(conversationId: string): Promise<ListingOffer[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, owner_id, participant_id, participant_name, listing_id, listing:listings(id, seller_id, year, make, model, image_url), messages:conversation_messages(id, body, sender_id, created_at)")
    .eq("id", conversationId)
    .maybeSingle<OfferConversationRow>();

  if (error || !data) return [];

  const listing = listingFromConversation(data);
  const messages = [...(data.messages ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const closures = buildOfferClosures(messages);

  const offers = messages
    .filter((message) => isOfferMessage(message.body))
    .map((message): ListingOffer | null => {
      const amount = amountFromOfferMessage(message.body);
      if (!amount) return null;

      const sellerId = listing?.seller_id ?? data.participant_id ?? "";
      const buyerId =
        message.sender_id && message.sender_id !== sellerId
          ? message.sender_id
          : data.owner_id;

      return {
        id: `message-offer-${message.id}`,
        conversationId: data.id,
        listingId: data.listing_id ?? listing?.id ?? data.id,
        buyerId,
        sellerId,
        amount,
        status: "pending",
        createdAt: message.created_at,
        listingTitle: listing
          ? [listing.year, listing.make, listing.model].filter(Boolean).join(" ")
          : "Listing conversation",
        listingImage: listing?.image_url ?? undefined,
      };
    })
    .filter((offer): offer is ListingOffer => Boolean(offer));

  return addBuyerNames(normalizePendingOffers(applyOfferClosures(offers, closures)));
}

function mergeOffers(structuredOffers: ListingOffer[], messageOffers: ListingOffer[]) {
  const offers = [...structuredOffers];

  for (const messageOffer of messageOffers) {
    const duplicate = offers.some(
      (offer) =>
        offer.conversationId === messageOffer.conversationId &&
        offer.listingId === messageOffer.listingId &&
        offer.amount === messageOffer.amount,
    );

    if (!duplicate) {
      offers.push(messageOffer);
      continue;
    }

    for (let index = 0; index < offers.length; index += 1) {
      const offer = offers[index];
      if (
        offer.conversationId === messageOffer.conversationId &&
        offer.listingId === messageOffer.listingId &&
        offer.amount === messageOffer.amount &&
        offer.status === "pending" &&
        messageOffer.status !== "pending"
      ) {
        offers[index] = {
          ...offer,
          status: messageOffer.status,
          responseReason: messageOffer.responseReason ?? offer.responseReason,
        };
      }
    }
  }

  return offers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function addBuyerNames(offers: ListingOffer[]) {
  const buyerIds = Array.from(new Set(offers.map((offer) => offer.buyerId).filter(Boolean)));
  if (buyerIds.length === 0) return offers;

  const { data } = await supabase
    .from("public_profiles")
    .select("id, full_name, handle")
    .in("id", buyerIds);

  const buyerNames = new Map(
    ((data ?? []) as OfferProfileRow[]).map((buyer) => [
      buyer.id,
      buyer.full_name || buyer.handle || "Buyer",
    ]),
  );

  return offers.map((offer) => ({
    ...offer,
    buyerName: buyerNames.get(offer.buyerId) ?? offer.buyerName ?? "Buyer",
  }));
}

// Offers reconstructed from the transcript carry placeholder listing ids
// ("message-offer-listing", "local-listing"). Sending those to a uuid column
// throws 22P02 instead of accepting the offer.
async function markListingSold(offer: ListingOffer, status: "accepted" | "declined") {
  if (status !== "accepted") return;
  if (!offer.sellerId || !isUuid(offer.sellerId)) return;
  if (!offer.listingId || !isUuid(offer.listingId)) return;

  const { error } = await supabase
    .from("listings")
    .update({ status: "sold", updated_at: new Date().toISOString() })
    .eq("id", offer.listingId)
    .eq("seller_id", offer.sellerId);

  if (error) throw error;

  await notifySoldListing({
    userId: offer.sellerId,
    listingId: offer.listingId,
    make: offer.listingTitle,
  });
}

export async function respondToListingOffer({
  offer,
  status,
  message,
}: {
  offer: ListingOffer;
  status: "accepted" | "declined";
  message: string;
}) {
  if (!isSupabaseConfigured) return;

  if (offer.id.startsWith("message-offer-")) {
    await sendConversationMessage(offer.conversationId, message, { notify: false });
    await markListingSold(offer, status);
    return;
  }

  const { data: updated, error } = await supabase
    .from("listing_offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", offer.id)
    .eq("seller_id", offer.sellerId)
    .select("id");

  if (error) {
    if (isMissingOffersSchema(error)) return;
    throw error;
  }
  // RLS denials come back as a successful update of zero rows. Without this the
  // app posts an "Accepted"/"Declined" message for a row that never changed.
  if (!updated?.length) {
    throw new Error("Could not update this offer. It may have already been answered.");
  }

  await sendConversationMessage(offer.conversationId, message, { notify: false });

  if (status === "accepted") {
    await notifyOfferAccepted({
      offerId: offer.id,
      recipientUserId: offer.buyerId,
      listingTitle: offer.listingTitle,
    });
    await notifyPickupNextStep({
      offerId: offer.id,
      recipientUserId: offer.buyerId,
      sellerName: "the seller",
      listingTitle: offer.listingTitle,
    });
  } else {
    await notifyOfferDeclined({
      offerId: offer.id,
      recipientUserId: offer.buyerId,
      listingTitle: offer.listingTitle,
    });
  }

  await markListingSold(offer, status);
}

export async function cancelListingOffer({
  offer,
  message,
}: {
  offer: ListingOffer;
  message: string;
}) {
  if (!isSupabaseConfigured) return;

  if (offer.id.startsWith("message-offer-")) {
    await sendConversationMessage(offer.conversationId, message);
    return;
  }

  const { data: updated, error } = await supabase
    .from("listing_offers")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", offer.id)
    .eq("buyer_id", offer.buyerId)
    .select("id");

  if (error) {
    if (isMissingOffersSchema(error)) return;
    throw error;
  }
  if (!updated?.length) {
    throw new Error("Could not cancel this offer. Refresh and try again.");
  }

  await sendConversationMessage(offer.conversationId, message);
}
