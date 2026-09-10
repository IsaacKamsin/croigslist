import { formatUsd } from "@/lib/formatters";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type NotificationEventType =
  | "match_found"
  | "strong_match"
  | "price_match"
  | "nearby_match"
  | "saved_bike_alert"
  | "new_message"
  | "offer_received"
  | "offer_updated"
  | "offer_accepted"
  | "offer_declined"
  | "offer_expiring"
  | "pickup_next_step"
  | "listing_activity"
  | "sold_listing"
  | "moving_fast"
  | "fresh_listing"
  | "rare_find"
  | "price_drop"
  | "still_available"
  | "high_interest"
  | "weekend_window"
  | "last_chance";

type BikeNotificationInput = {
  userId: string;
  listingId?: string;
  year?: number | string;
  make?: string;
  model?: string;
  price?: number;
  city?: string;
  views?: number;
};

type OfferNotificationInput = {
  offerId: string;
  recipientUserId: string;
  buyerName?: string;
  sellerName?: string;
  listingTitle?: string;
  make?: string;
  model?: string;
  amount?: number;
};

type MessageNotificationInput = {
  conversationId: string;
  recipientUserId: string;
  senderName?: string;
  listingTitle?: string;
  body?: string;
};

function bikeName(input: BikeNotificationInput) {
  return [input.year, input.make, input.model].filter(Boolean).join(" ");
}

function listingName(input: OfferNotificationInput) {
  return input.listingTitle || [input.make, input.model].filter(Boolean).join(" ") || "the listing";
}

async function sendNotification({
  userIds,
  title,
  body,
  eventType,
  referenceId,
  data,
}: {
  userIds: string[];
  title: string;
  body: string;
  eventType: NotificationEventType;
  referenceId?: string;
  data?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured || userIds.length === 0) return;

  const { error } = await supabase.functions.invoke("send-push-notification", {
    body: {
      userIds,
      title,
      body,
      eventType,
      referenceId,
      data: {
        eventType,
        referenceId,
        ...data,
      },
    },
  });

  if (error) {
    console.warn("Push notification event failed.", error.message);
  }
}

export async function notifyMatchFound(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "match_found",
    referenceId: input.listingId,
    title: "Match found",
    body: `${bikeName(input) || "A saved bike"} just hit the market.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyStrongMatch(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "strong_match",
    referenceId: input.listingId,
    title: "Strong match",
    body: `${[input.make, input.model].filter(Boolean).join(" ") || "Your match"} is live. Check it before it moves.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyPriceMatch(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "price_match",
    referenceId: input.listingId,
    title: "Price match",
    body: `${[input.make, input.model].filter(Boolean).join(" ") || "A saved bike"} listed at ${formatUsd(input.price ?? 0)}.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyNearbyMatch(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "nearby_match",
    referenceId: input.listingId,
    title: "Nearby match",
    body: `${[input.make, input.model].filter(Boolean).join(" ") || "A saved bike"} just appeared near ${input.city || "you"}.`,
    data: { listingId: input.listingId },
  });
}

export async function notifySavedBikeAlert(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "saved_bike_alert",
    referenceId: input.listingId,
    title: "Saved bike alert",
    body: `We found a listing close to your saved ${[input.make, input.model].filter(Boolean).join(" ") || "bike"}.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyNewMessage(input: MessageNotificationInput) {
  await sendNotification({
    userIds: [input.recipientUserId],
    eventType: "new_message",
    referenceId: input.conversationId,
    title: input.senderName ? `${input.senderName} messaged you` : "New message",
    body: input.listingTitle
      ? `New message about ${input.listingTitle}.`
      : input.body?.slice(0, 120) || "Open the conversation.",
    data: { conversationId: input.conversationId },
  });
}

export async function notifyOfferReceived(input: OfferNotificationInput) {
  await sendNotification({
    userIds: [input.recipientUserId],
    eventType: "offer_received",
    referenceId: input.offerId,
    title: "New offer",
    body: `${input.buyerName || "A buyer"} offered ${formatUsd(input.amount ?? 0)} on ${listingName(input)}.`,
    data: { offerId: input.offerId },
  });
}

export async function notifyOfferUpdated(input: OfferNotificationInput) {
  await sendNotification({
    userIds: [input.recipientUserId],
    eventType: "offer_updated",
    referenceId: input.offerId,
    title: "Offer updated",
    body: `${input.buyerName || "A buyer"} raised their offer to ${formatUsd(input.amount ?? 0)}.`,
    data: { offerId: input.offerId },
  });
}

export async function notifyOfferAccepted(input: OfferNotificationInput) {
  await sendNotification({
    userIds: [input.recipientUserId],
    eventType: "offer_accepted",
    referenceId: input.offerId,
    title: "Offer accepted",
    body: `Your offer on ${listingName(input)} was accepted.`,
    data: { offerId: input.offerId },
  });
}

export async function notifyOfferDeclined(input: OfferNotificationInput) {
  await sendNotification({
    userIds: [input.recipientUserId],
    eventType: "offer_declined",
    referenceId: input.offerId,
    title: "Offer declined",
    body: `Your offer on ${listingName(input)} was declined.`,
    data: { offerId: input.offerId },
  });
}

export async function notifyPickupNextStep(input: OfferNotificationInput) {
  await sendNotification({
    userIds: [input.recipientUserId],
    eventType: "pickup_next_step",
    referenceId: input.offerId,
    title: "Pickup next step",
    body: `Keep the deal moving. Confirm pickup details with ${input.sellerName || "the seller"}.`,
    data: { offerId: input.offerId },
  });
}

export async function notifySoldListing(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "sold_listing",
    referenceId: input.listingId,
    title: "Listing sold",
    body: `${[input.make, input.model].filter(Boolean).join(" ") || "Your listing"} is marked sold.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyMovingFast(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "moving_fast",
    referenceId: input.listingId,
    title: "Moving fast",
    body: `${[input.make, input.model].filter(Boolean).join(" ") || "This bike"} is getting attention. Message the seller now.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyFreshListing(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "fresh_listing",
    referenceId: input.listingId,
    title: "Fresh listing",
    body: `New bike just posted: ${bikeName(input) || "open the listing"}.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyRareFind(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "rare_find",
    referenceId: input.listingId,
    title: "Rare find",
    body: `Rare find listed: ${bikeName(input) || "open the listing"}.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyPriceDrop(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "price_drop",
    referenceId: input.listingId,
    title: "Price drop",
    body: `${[input.make, input.model].filter(Boolean).join(" ") || "A bike"} dropped to ${formatUsd(input.price ?? 0)}.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyStillAvailable(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "still_available",
    referenceId: input.listingId,
    title: "Still available",
    body: `${[input.make, input.model].filter(Boolean).join(" ") || "That bike"} is still live. Do not wait too long.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyHighInterest(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "high_interest",
    referenceId: input.listingId,
    title: "High interest",
    body: `${[input.make, input.model].filter(Boolean).join(" ") || "This bike"} has ${input.views ?? "new"} watchers.`,
    data: { listingId: input.listingId },
  });
}

export async function notifyWeekendWindow(userId: string) {
  await sendNotification({
    userIds: [userId],
    eventType: "weekend_window",
    title: "Weekend window",
    body: "Good bikes move on weekends. Check today's new listings.",
  });
}

export async function notifyLastChance(input: BikeNotificationInput) {
  await sendNotification({
    userIds: [input.userId],
    eventType: "last_chance",
    referenceId: input.listingId,
    title: "Last chance",
    body: `${[input.make, input.model].filter(Boolean).join(" ") || "This bike"} may not sit long. Open the listing.`,
    data: { listingId: input.listingId },
  });
}
