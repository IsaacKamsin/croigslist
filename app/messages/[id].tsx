import { COLORS, F, SPACING } from "@/constants/design";
import { useAuth } from "@/context/AuthContext";
import { hapticLight } from "@/hooks/useHaptics";
import { formatUsd } from "@/lib/formatters";
import {
  deleteConversation,
  fetchConversationContext,
  fetchConversationMessages,
  markConversationRead,
  restoreConversation,
  sendConversationMessage,
  type ConversationMessage,
} from "@/lib/messages-db";
import { backOrReplace } from "@/lib/navigation";
import {
  applyOfferClosures,
  buildOfferClosures,
  cancelListingOffer,
  fetchConversationOffers,
  normalizePendingOffers,
  respondToListingOffer,
  type ListingOffer,
  type OfferStatus,
} from "@/lib/offers-db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeftIcon, DotsThreeIcon } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Bubble ────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: ConversationMessage }) {
  return (
    <View style={[styles.bubbleRow, msg.fromMe && styles.bubbleRowMe]}>
      <View
        style={[
          styles.bubble,
          msg.fromMe ? styles.bubbleMe : styles.bubbleThem,
        ]}
      >
        <Text style={[styles.bubbleText, msg.fromMe && styles.bubbleTextMe]}>
          {msg.text}
        </Text>
      </View>
      <Text style={[styles.bubbleTime, msg.fromMe && styles.bubbleTimeMe]}>
        {msg.time}
      </Text>
    </View>
  );
}

function OfferCard({
  offer,
  canRespond,
  canCancel,
  onAccept,
  onDecline,
  onCancel,
}: {
  offer: ListingOffer;
  canRespond: boolean;
  canCancel: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  const pending = offer.status === "pending";
  const statusLabel =
    offer.status === "accepted"
      ? "Accepted"
      : offer.status === "declined"
        ? "Declined"
        : offer.status === "cancelled"
          ? "Cancelled"
          : "Pending";

  return (
    <View style={styles.offerCard}>
      <View style={styles.offerCardTop}>
        <View>
          <Text style={styles.offerLabel}>Offer</Text>
          <Text style={styles.offerAmount}>{formatUsd(offer.amount)}</Text>
          {offer.listingTitle ? (
            <Text style={styles.offerListingTitle} numberOfLines={1}>
              {offer.listingTitle}
            </Text>
          ) : null}
          {offer.buyerName ? (
            <Text style={styles.offerBuyerName} numberOfLines={1}>
              From {offer.buyerName}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.offerStatus,
            offer.status === "accepted" && styles.offerStatusAccepted,
            offer.status === "declined" && styles.offerStatusDeclined,
          ]}
        >
          <Text
            style={[
              styles.offerStatusText,
              offer.status === "accepted" && styles.offerStatusTextOnDark,
              offer.status === "declined" && styles.offerStatusTextOnDark,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {canRespond && pending ? (
        <View style={styles.offerActions}>
          <Pressable style={styles.offerDeclineButton} onPress={onDecline}>
            <Text style={styles.offerDeclineText}>Decline</Text>
          </Pressable>
          <Pressable style={styles.offerAcceptButton} onPress={onAccept}>
            <Text style={styles.offerAcceptText}>Accept offer</Text>
          </Pressable>
        </View>
      ) : canCancel && pending ? (
        <View style={styles.offerActions}>
          <Pressable style={styles.offerCancelButton} onPress={onCancel}>
            <Text style={styles.offerDeclineText}>Cancel offer</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.offerHelp}>
          {offer.responseReason
            ? offer.responseReason
            : offer.status === "cancelled"
              ? "You cancelled this offer."
            : pending
              ? "Waiting for seller response."
              : "This offer has been closed."}
        </Text>
      )}
    </View>
  );
}

function amountFromOfferMessage(body: string) {
  const match = body.match(/\$([\d,]+)/);
  return match ? Number(match[1].replace(/[^\d]/g, "")) : 0;
}

function isOfferMessage(body: string) {
  return /^Offer:\s*\$[\d,]+/i.test(body) || /^I want to buy\b.+\bfor\s+\$[\d,]+/i.test(body);
}

function isOfferStatusMessage(body: string) {
  return /^(Accepted|Declined|Cancelled) offer:\s*\$[\d,]+/i.test(body);
}

const DECLINE_REASONS = [
  "Offer is too low",
  "Bike is no longer available",
  "I am considering other offers",
];

const SUPERSEDED_OFFER_REASON = "A newer pending offer replaced this one.";
const EMPTY_MESSAGES: ConversationMessage[] = [];
const EMPTY_OFFERS: ListingOffer[] = [];

function usefulName(value: string | undefined, fallbackLabel: "Buyer" | "Seller") {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === fallbackLabel) return "";
  return trimmed;
}

function messagesMatch(a: ConversationMessage[], b: ConversationMessage[]) {
  if (a.length !== b.length) return false;
  return a.every((message, index) => {
    const next = b[index];
    return (
      message.id === next.id &&
      message.text === next.text &&
      message.fromMe === next.fromMe &&
      message.time === next.time
    );
  });
}

function isSupersededOffer(offer: ListingOffer) {
  return offer.status === "cancelled" && offer.responseReason === SUPERSEDED_OFFER_REASON;
}

function offerGroupKey(offer: ListingOffer) {
  return `${offer.listingId}:${offer.buyerId || offer.buyerName || "buyer"}`;
}

function compactAmounts(offers: ListingOffer[]) {
  const counts = new Map<number, number>();
  for (const offer of offers) {
    counts.set(offer.amount, (counts.get(offer.amount) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => b - a)
    .map(([amount, count]) => `${formatUsd(amount)}${count > 1 ? ` x${count}` : ""}`)
    .join(", ");
}

function OfferHistoryCard({ offers }: { offers: ListingOffer[] }) {
  return (
    <View style={styles.offerHistoryCard}>
      <View>
        <Text style={styles.offerLabel}>Previous offers</Text>
        <Text style={styles.offerHistoryTitle}>
          {offers.length} previous {offers.length === 1 ? "offer" : "offers"}
        </Text>
        <Text style={styles.offerHistoryAmounts} numberOfLines={2}>
          {compactAmounts(offers)}
        </Text>
      </View>
      <Text style={styles.offerHistoryBody}>
        Only the newest offer needs action.
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────
export default function ConversationScreen() {
  const {
    id,
    counterpartyName,
    sellerName,
    buyerName,
    listingTitle,
    pendingMessage,
    pendingOfferAmount,
    pendingOfferId,
    pendingOfferListingId,
    pendingOfferSellerId,
    archived,
  } = useLocalSearchParams<{
    id: string;
    counterpartyName?: string;
    sellerName?: string;
    buyerName?: string;
    listingTitle?: string;
    pendingMessage?: string;
    pendingOfferAmount?: string;
    pendingOfferId?: string;
    pendingOfferListingId?: string;
    pendingOfferSellerId?: string;
    archived?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { member } = useAuth();
  const isArchived = archived === "1";
  const [headerAvatarFailed, setHeaderAvatarFailed] = useState(false);
  const { data: conversationContext, refetch: refetchContext } = useQuery({
    queryKey: ["conversation-context", id],
    queryFn: () => fetchConversationContext(id),
    enabled: Boolean(id),
    refetchOnMount: "always",
  });
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const {
    data: fetchedMessages = EMPTY_MESSAGES,
    refetch: refetchMessages,
    isPending: isPendingMessages,
  } = useQuery({
    queryKey: ["conversation-messages", id],
    queryFn: () => fetchConversationMessages(id),
    enabled: Boolean(id),
    refetchOnMount: "always",
  });
  const {
    data: fetchedOffers = EMPTY_OFFERS,
    refetch: refetchOffers,
    isPending: isPendingOffers,
  } = useQuery({
    queryKey: ["conversation-offers", id],
    queryFn: () => fetchConversationOffers(id),
    enabled: Boolean(id),
    refetchOnMount: "always",
  });
  const isViewingAsSeller = Boolean(
    member?.id &&
      (conversationContext?.sellerId === member.id ||
        pendingOfferSellerId === member.id ||
        fetchedOffers.some((offer) => offer.sellerId === member.id)),
  );
  const sellerDisplayName =
    usefulName(conversationContext?.sellerName, "Seller") ||
    usefulName(sellerName, "Seller") ||
    "Seller";
  const buyerDisplayName =
    usefulName(conversationContext?.buyerName, "Buyer") ||
    usefulName(buyerName, "Buyer") ||
    "Buyer";
  const resolvedBuyerDisplayName =
    buyerDisplayName !== sellerDisplayName ? buyerDisplayName : "Buyer";
  const name =
    usefulName(conversationContext?.counterpartyName, isViewingAsSeller ? "Buyer" : "Seller") ||
    usefulName(counterpartyName, isViewingAsSeller ? "Buyer" : "Seller") ||
    (isViewingAsSeller ? resolvedBuyerDisplayName : sellerDisplayName);
  const contextTitle =
    listingTitle || conversationContext?.listingTitle || "Seller conversation";
  const isListingConversation = contextTitle !== "Seller conversation";
  const showHeaderAvatar =
    Boolean(conversationContext?.counterpartyAvatarUrl) && !headerAvatarFailed;
  const composePlaceholder = isViewingAsSeller
    ? "Reply..."
    : isListingConversation
      ? "Ask about this bike..."
      : "Message seller...";

  const resolvedSellerId = conversationContext?.sellerId ?? pendingOfferSellerId ?? "";
  const offerClosures = useMemo(
    () =>
      buildOfferClosures(
        fetchedMessages.map((message) => ({
          body: message.text,
          created_at: message.createdAt,
        })),
      ),
    [fetchedMessages],
  );
  const optimisticOffer = useMemo<ListingOffer | null>(() => {
    const amount = pendingOfferAmount ? Number(pendingOfferAmount) : 0;
    if (!amount || !id) return null;
    return {
      id: pendingOfferId || `local-offer-${id}-${amount}`,
      conversationId: id,
      listingId: pendingOfferListingId || "local-listing",
      buyerId: member?.id || "local-buyer",
      sellerId: resolvedSellerId,
      amount,
      status: "pending" as OfferStatus,
      createdAt: new Date().toISOString(),
      listingTitle: contextTitle,
      buyerName: isViewingAsSeller ? resolvedBuyerDisplayName : "You",
    };
  }, [contextTitle, id, isViewingAsSeller, member?.id, pendingOfferAmount, pendingOfferId, pendingOfferListingId, resolvedBuyerDisplayName, resolvedSellerId]);
  const offers = useMemo(() => {
    const messageOffers: ListingOffer[] = [];
    for (const message of fetchedMessages) {
      if (!isOfferMessage(message.text)) continue;
      const amount = amountFromOfferMessage(message.text);
      if (!amount) continue;
      messageOffers.push({
        id: `message-offer-${message.id}`,
        conversationId: id,
        listingId: pendingOfferListingId || "message-offer-listing",
        buyerId: message.fromMe ? member?.id || "message-buyer" : "message-buyer",
        sellerId: resolvedSellerId,
        amount,
        status: "pending",
        createdAt: message.createdAt,
        listingTitle: contextTitle,
        buyerName: message.fromMe ? "You" : resolvedBuyerDisplayName,
      });
    }
    const baseOffers: ListingOffer[] = fetchedOffers.map((offer) => {
      const fallbackBuyerName =
        offer.buyerId && offer.buyerId === member?.id
          ? "You"
          : resolvedBuyerDisplayName;
      const offerBuyerName = usefulName(offer.buyerName, "Buyer");

      return {
        ...offer,
        buyerName:
          offerBuyerName && offerBuyerName !== sellerDisplayName
            ? offerBuyerName
            : fallbackBuyerName,
      };
    });

    // Count-based dedupe: a structured offer covers one message-derived offer of
    // the same amount, not every one of them, so re-offering an amount still shows.
    const remainingByAmount = new Map<number, number>();
    for (const offer of baseOffers) {
      remainingByAmount.set(offer.amount, (remainingByAmount.get(offer.amount) ?? 0) + 1);
    }
    for (const messageOffer of messageOffers) {
      const covered = remainingByAmount.get(messageOffer.amount) ?? 0;
      if (covered > 0) {
        remainingByAmount.set(messageOffer.amount, covered - 1);
        continue;
      }
      baseOffers.push(messageOffer);
    }

    const withOptimistic = (() => {
      if (!optimisticOffer) return baseOffers;
      // Match on amount alone: the optimistic card is scoped to this conversation,
      // and its placeholder listingId won't equal the real offer's uuid.
      const alreadyFetched = baseOffers.some(
        (offer) => offer.id === optimisticOffer.id || offer.amount === optimisticOffer.amount,
      );
      return alreadyFetched ? baseOffers : [...baseOffers, optimisticOffer];
    })();

    return normalizePendingOffers(applyOfferClosures(withOptimistic, offerClosures));
  }, [contextTitle, fetchedMessages, fetchedOffers, id, member?.id, offerClosures, optimisticOffer, pendingOfferListingId, resolvedBuyerDisplayName, resolvedSellerId, sellerDisplayName]);
  const { visibleOffers, historicalOffers } = useMemo(() => {
    const latestVisibleByGroup = new Map<string, ListingOffer>();

    for (const offer of offers) {
      if (isSupersededOffer(offer)) continue;
      const key = offerGroupKey(offer);
      const current = latestVisibleByGroup.get(key);
      if (!current || offer.createdAt > current.createdAt) {
        latestVisibleByGroup.set(key, offer);
      }
    }

    const visibleIds = new Set(
      Array.from(latestVisibleByGroup.values()).map((offer) => offer.id),
    );

    return {
      visibleOffers: offers.filter((offer) => visibleIds.has(offer.id)),
      historicalOffers: offers.filter((offer) => !visibleIds.has(offer.id)),
    };
  }, [offers]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      markConversationRead(id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["message-threads", "inbox"] });
          queryClient.invalidateQueries({ queryKey: ["message-threads", "archived"] });
        })
        .catch(() => undefined);
      refetchContext();
      refetchMessages();
      refetchOffers();
    }, [id, queryClient, refetchContext, refetchMessages, refetchOffers]),
  );

  useEffect(() => {
    setHeaderAvatarFailed(false);
  }, [conversationContext?.counterpartyAvatarUrl]);

  useEffect(() => {
    const visibleMessages = fetchedMessages.filter(
      (message) => !isOfferMessage(message.text) && !isOfferStatusMessage(message.text),
    );
    const optimisticMessage =
      pendingMessage &&
      !isOfferMessage(pendingMessage) &&
      !isOfferStatusMessage(pendingMessage) &&
      !fetchedMessages.some((message) => message.text === pendingMessage)
        ? [{
            id: `local-message-${id}-${pendingMessage}`,
            text: pendingMessage,
            fromMe: true,
            time: "now",
            createdAt: new Date().toISOString(),
          } satisfies ConversationMessage]
        : [];
    const nextMessages = [...visibleMessages, ...optimisticMessage];
    setMessages((current) =>
      messagesMatch(current, nextMessages) ? current : nextMessages,
    );
  }, [fetchedMessages, id, pendingMessage]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || !id) return;
    hapticLight();
    const msgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        text,
        fromMe: true,
        time: "sending...",
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      await sendConversationMessage(id, text);
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", id] });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, time: "now" } : m)),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, time: "failed" } : m)),
      );
    }
  }, [draft, id, queryClient]);
  const respondToOffer = useCallback(
    async (offer: ListingOffer, status: "accepted" | "declined", declineReason?: string) => {
      hapticLight();
      const message =
        status === "accepted"
          ? `Accepted offer: ${formatUsd(offer.amount)}. Let's coordinate pickup and payment.`
          : `Declined offer: ${formatUsd(offer.amount)}. ${declineReason || DECLINE_REASONS[0]}`;

      try {
        await respondToListingOffer({ offer, status, message });
      } catch (error) {
        Alert.alert(
          status === "accepted" ? "Could not accept offer" : "Could not decline offer",
          error instanceof Error ? error.message : "Try again in a moment.",
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["conversation-offers", id] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", id] });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["shops-tab"] });
      queryClient.invalidateQueries({ queryKey: ["listing", offer.listingId] });
    },
    [id, queryClient],
  );
  const cancelOffer = useCallback(
    async (offer: ListingOffer) => {
      hapticLight();
      const message = `Cancelled offer: ${formatUsd(offer.amount)}.`;

      try {
        await cancelListingOffer({ offer, message });
      } catch (error) {
        Alert.alert(
          "Could not cancel offer",
          error instanceof Error ? error.message : "Try again in a moment.",
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["conversation-offers", id] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", id] });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["listing", offer.listingId] });
    },
    [id, queryClient],
  );
  const archiveConversation = useCallback(async () => {
    hapticLight();
    try {
      await deleteConversation(id);
    } catch {
      Alert.alert("Archive failed", "Could not archive this conversation. Try again.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["message-threads", "inbox"] });
    queryClient.invalidateQueries({ queryKey: ["message-threads", "archived"] });
    queryClient.removeQueries({ queryKey: ["conversation-messages", id] });
    queryClient.removeQueries({ queryKey: ["conversation-offers", id] });
    queryClient.removeQueries({ queryKey: ["conversation-context", id] });
    backOrReplace(router, "/(tabs)/messages");
  }, [id, queryClient, router]);
  const restoreArchivedConversation = useCallback(async () => {
    hapticLight();
    try {
      await restoreConversation(id);
    } catch {
      Alert.alert("Restore failed", "Could not restore this conversation. Try again.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["message-threads", "inbox"] });
    queryClient.invalidateQueries({ queryKey: ["message-threads", "archived"] });
    queryClient.removeQueries({ queryKey: ["conversation-messages", id] });
    queryClient.removeQueries({ queryKey: ["conversation-offers", id] });
    queryClient.removeQueries({ queryKey: ["conversation-context", id] });
    backOrReplace(router, "/(tabs)/messages");
  }, [id, queryClient, router]);
  const confirmArchiveConversation = useCallback(() => {
    if (isArchived) {
      Alert.alert(
        "Restore conversation",
        "This moves the thread back to your inbox.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Restore", onPress: restoreArchivedConversation },
        ],
      );
      return;
    }

    Alert.alert(
      "Archive conversation",
      "This removes the thread from your inbox. Offers and the other person's copy stay on the record.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Archive", style: "destructive", onPress: archiveConversation },
      ],
    );
  }, [archiveConversation, isArchived, restoreArchivedConversation]);
  const openThreadMenu = useCallback(() => {
    hapticLight();
    Alert.alert(name, contextTitle, [
      { text: "Cancel", style: "cancel" },
      { text: "Reply", onPress: () => inputRef.current?.focus() },
      {
        text: isArchived ? "Restore" : "Archive",
        style: isArchived ? "default" : "destructive",
        onPress: confirmArchiveConversation,
      },
    ]);
  }, [confirmArchiveConversation, contextTitle, isArchived, name]);
  const declineOffer = useCallback(
    (offer: ListingOffer) => {
      Alert.alert(
        "Decline offer",
        "Choose a reason to show in the conversation.",
        [
          { text: "Cancel", style: "cancel" },
          ...DECLINE_REASONS.map((reason) => ({
            text: reason,
            onPress: () => respondToOffer(offer, "declined", reason),
          })),
        ],
      );
    },
    [respondToOffer],
  );
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => backOrReplace(router, "/(tabs)/messages")} style={styles.backBtn}>
          <CaretLeftIcon size={26} color={COLORS.textPrimary} weight="bold" />
        </Pressable>
        <View style={styles.headerAvatar}>
          {showHeaderAvatar ? (
            <Image
              source={{ uri: conversationContext?.counterpartyAvatarUrl }}
              style={styles.headerAvatarImage}
              onError={() => setHeaderAvatarFailed(true)}
            />
          ) : (
            <Text style={styles.headerAvatarText}>{name[0]}</Text>
          )}
        </View>
        <View style={styles.headerTitle}>
          <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
          <Text style={styles.headerListing} numberOfLines={1}>
            {isListingConversation ? contextTitle : "Seller conversation"}
          </Text>
        </View>
        <Pressable onPress={openThreadMenu} style={styles.headerMenuBtn}>
          <DotsThreeIcon size={26} color={COLORS.textPrimary} weight="bold" />
        </Pressable>
      </View>
      <View style={styles.divider} />

      {/* ── Messages + Compose ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble msg={item} />}
          contentContainerStyle={styles.messageList}
          ListHeaderComponent={
            <View style={styles.threadIntro}>
              {offers.length > 0 ? (
                <View style={styles.offerList}>
                  {visibleOffers.map((offer) => {
                    const isOfferSeller = Boolean(member?.id && member.id === offer.sellerId);
                    const isOfferBuyer = Boolean(member?.id && member.id === offer.buyerId);

                    return (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        canRespond={isOfferSeller}
                        canCancel={!isOfferSeller && isOfferBuyer}
                        onAccept={() => respondToOffer(offer, "accepted")}
                        onDecline={() => declineOffer(offer)}
                        onCancel={() => cancelOffer(offer)}
                      />
                    );
                  })}
                  {historicalOffers.length > 0 ? (
                    <OfferHistoryCard offers={historicalOffers} />
                  ) : null}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            !isPendingMessages && !isPendingOffers && offers.length === 0 ? (
              <View style={styles.emptyThread}>
                <Text style={styles.emptyThreadTitle}>Start the conversation</Text>
                <Text style={styles.emptyThreadBody}>
                  {isListingConversation
                    ? `Ask ${name} about timing, pickup, or details before making an offer.`
                    : `Send a direct message to ${name}.`}
                </Text>
              </View>
            ) : null
          }
          onContentSizeChange={() => {
            if (messages.length > 0) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        <View style={styles.compose}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={composePlaceholder}
            placeholderTextColor={COLORS.textMuted}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Pressable
            style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!draft.trim()}
          >
            <Text style={styles.sendBtnText}>SEND</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Profile completion
  profileModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  profileModal: {
    paddingHorizontal: SPACING.page,
    paddingTop: 18,
    paddingBottom: 34,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: COLORS.white,
  },
  profileModalEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.monoBold,
    letterSpacing: 1.6,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  profileModalTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  profileModalBody: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  profilePhotoButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: COLORS.surfaceRaised,
    marginTop: 22,
  },
  profilePhotoPreview: {
    width: "100%",
    height: "100%",
  },
  profilePhotoText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  profileNameInput: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 17,
    fontFamily: F.regular,
    color: COLORS.textPrimary,
    marginTop: 18,
  },
  profileRequirementText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  profileSaveButton: {
    minHeight: 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.black,
    marginTop: 14,
  },
  profileSaveButtonDisabled: {
    opacity: 0.35,
  },
  profileSaveText: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.white,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.page,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: COLORS.gray300,
    marginRight: 10,
  },
  headerAvatarImage: {
    width: "100%",
    height: "100%",
  },
  headerAvatarText: {
    fontSize: 16,
    lineHeight: 19,
    fontFamily: F.bold,
    color: COLORS.white,
  },
  headerTitle: {
    flex: 1,
    alignItems: "flex-start",
    paddingRight: 8,
  },
  headerName: {
    maxWidth: "100%",
    fontSize: 15,
    lineHeight: 18,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  headerListing: {
    maxWidth: "100%",
    fontSize: 12,
    lineHeight: 15,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  headerMenuBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -10,
  },
  divider: { height: 0.5, backgroundColor: COLORS.divider },

  // Messages
  messageList: {
    flexGrow: 1,
    paddingHorizontal: SPACING.page,
    paddingTop: 18,
    paddingBottom: SPACING.lg,
    gap: 16,
  },
  bubbleRow: { alignItems: "flex-start", gap: 4 },
  bubbleRowMe: { alignItems: "flex-end" },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: COLORS.accent },
  bubbleThem: { backgroundColor: COLORS.black },
  bubbleText: {
    fontSize: 13,
    fontFamily: F.mono,
    color: COLORS.white,
    lineHeight: 19,
  },
  bubbleTextMe: { color: COLORS.white },
  bubbleTime: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  bubbleTimeMe: { textAlign: "right" },

  // Offers
  threadIntro: {
    gap: 14,
    marginBottom: 16,
  },
  offerList: {
    gap: 12,
  },
  offerCard: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 6,
    padding: 14,
    backgroundColor: COLORS.white,
  },
  offerHistoryCard: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceRaised,
  },
  offerCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  offerLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.monoBold,
    letterSpacing: 1.3,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  offerAmount: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  offerHistoryTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  offerHistoryAmounts: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  offerHistoryBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 10,
  },
  offerListingTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  offerBuyerName: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  offerStatus: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceRaised,
  },
  offerStatusAccepted: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success,
  },
  offerStatusDeclined: {
    borderColor: COLORS.black,
    backgroundColor: COLORS.black,
  },
  offerStatusText: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  offerStatusTextOnDark: {
    color: COLORS.white,
  },
  offerHelp: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  offerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  offerDeclineButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.black,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  offerCancelButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.black,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  offerDeclineText: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  offerAcceptButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  offerAcceptText: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.white,
  },

  emptyThread: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 8,
    padding: 18,
    backgroundColor: COLORS.surfaceRaised,
  },
  emptyThreadTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  emptyThreadBody: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  // Compose
  compose: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: SPACING.page,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.divider,
    gap: 10,
    backgroundColor: COLORS.bg,
  },
  input: {
    flex: 1,
    minHeight: 46,
    fontSize: 15,
    fontFamily: F.regular,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 23,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: COLORS.black,
    borderRadius: 23,
    minHeight: 46,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.white,
  },
});
