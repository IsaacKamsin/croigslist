import { ScreenHeader } from "@/components/ScreenHeader";
import { StatusState } from "@/components/StatusState";
import { COLORS, F, SPACING, TYPE } from "@/constants/design";
import { S } from "@/constants/styles";
import { formatUsd } from "@/lib/formatters";
import {
  deleteConversation as archiveConversation,
  fetchMessageThreads,
  restoreConversation,
  type MessageThread,
} from "@/lib/messages-db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { DotsThreeIcon } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ThreadRow({
  item,
  onPress,
  actionLabel,
  onAction,
}: {
  item: MessageThread;
  onPress: () => void;
  actionLabel: "Archive" | "Restore";
  onAction: () => void;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const showAvatar = Boolean(item.avatarUrl) && !avatarFailed;
  const hasOffer = Boolean(item.offerAmount);
  const offerStatus =
    item.offerStatus === "accepted"
      ? "Accepted"
      : item.offerStatus === "declined"
        ? "Declined"
        : item.offerStatus === "cancelled"
          ? "Cancelled"
          : "Pending";
  const offerPillLabel = `${offerStatus} · ${formatUsd(item.offerAmount ?? 0)}`;
  const contextLabel = item.listingTitle
    ? item.listingTitle
    : "Seller conversation";

  return (
    <Pressable style={styles.thread} onPress={onPress}>
      <View style={styles.avatar}>
        {showAvatar ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={styles.avatarImage}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <Text style={styles.avatarText}>{item.name[0]}</Text>
        )}
      </View>

      <View style={styles.threadBody}>
        <View style={styles.threadTop}>
          <Text
            style={[styles.threadName, item.unread && styles.threadNameUnread]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={styles.threadTime}>{item.time}</Text>
        </View>
        {hasOffer ? (
          <>
            <Text style={styles.threadContext} numberOfLines={1}>
              {contextLabel}
            </Text>
            <View
              style={[
                styles.offerStatusPill,
                item.offerStatus === "accepted" && styles.offerStatusPillAccepted,
                (!item.offerStatus || item.offerStatus === "pending") &&
                  styles.offerStatusPillPending,
                item.offerStatus === "declined" && styles.offerStatusPillDeclined,
                item.offerStatus === "cancelled" && styles.offerStatusPillCancelled,
              ]}
            >
              <Text
                style={[
                  styles.offerStatusPillText,
                  item.offerStatus === "accepted" && styles.offerStatusTextAccepted,
                  (!item.offerStatus || item.offerStatus === "pending") &&
                    styles.offerStatusTextPending,
                  item.offerStatus === "declined" && styles.offerStatusTextDeclined,
                  item.offerStatus === "cancelled" && styles.offerStatusTextCancelled,
                ]}
              >
                {offerPillLabel}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.threadContext} numberOfLines={1}>
            {contextLabel}
          </Text>
        )}
        <Text style={styles.threadMessage} numberOfLines={1}>
          {item.last || "No messages yet"}
        </Text>
      </View>

      <View style={styles.threadActions}>
        <Pressable
          style={styles.threadMenuButton}
          onPress={onAction}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} conversation with ${item.name}`}
        >
          <DotsThreeIcon size={22} color={COLORS.textMuted} weight="bold" />
        </Pressable>
        {item.unread && <View style={styles.unreadDot} />}
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mailbox, setMailbox] = useState<"inbox" | "archived">("inbox");
  const { data: threads, refetch, isPending, isFetching } = useQuery({
    queryKey: ["message-threads", mailbox],
    queryFn: () => fetchMessageThreads(mailbox),
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });
  const hasLoadedThreads = Boolean(threads);
  const messageThreads = threads ?? [];

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const confirmThreadAction = useCallback(
    (thread: MessageThread) => {
      const restoring = mailbox === "archived";
      Alert.alert(
        restoring ? "Restore conversation" : "Archive conversation",
        restoring
          ? "This moves the thread back to your inbox."
          : "This removes the thread from your inbox. Offers and the other person's copy stay on the record.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: restoring ? "Restore" : "Archive",
            style: restoring ? "default" : "destructive",
            onPress: async () => {
              try {
                if (restoring) {
                  await restoreConversation(thread.id);
                } else {
                  await archiveConversation(thread.id);
                }
                queryClient.invalidateQueries({ queryKey: ["message-threads", "inbox"] });
                queryClient.invalidateQueries({ queryKey: ["message-threads", "archived"] });
              } catch (error) {
                Alert.alert(
                  restoring ? "Restore failed" : "Archive failed",
                  error instanceof Error ? error.message : "Try again in a moment.",
                );
              }
            },
          },
        ],
      );
    },
    [mailbox, queryClient],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title="MESSAGES"
        right={
          <View style={styles.mailboxTabs}>
            <Pressable
              style={[styles.mailboxTab, mailbox === "inbox" && styles.mailboxTabActive]}
              onPress={() => setMailbox("inbox")}
            >
              <Text
                style={[
                  styles.mailboxTabText,
                  mailbox === "inbox" && styles.mailboxTabTextActive,
                ]}
              >
                INBOX
              </Text>
            </Pressable>
            <Pressable
              style={[styles.mailboxTab, mailbox === "archived" && styles.mailboxTabActive]}
              onPress={() => setMailbox("archived")}
            >
              <Text
                style={[
                  styles.mailboxTabText,
                  mailbox === "archived" && styles.mailboxTabTextActive,
                ]}
              >
                ARCHIVED
              </Text>
            </Pressable>
          </View>
        }
      />

      <FlatList
        data={messageThreads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ThreadRow
            item={item}
            actionLabel={mailbox === "archived" ? "Restore" : "Archive"}
            onAction={() => confirmThreadAction(item)}
            onPress={() =>
              router.push({
                pathname: "/messages/[id]",
                params: {
                  id: item.id,
                  counterpartyName: item.name,
                  listingTitle: item.listingTitle ?? "",
                  pendingOfferAmount: item.offerAmount
                    ? String(item.offerAmount)
                    : "",
                  pendingOfferId: item.offerId ?? "",
                  pendingOfferListingId: item.offerListingId ?? "",
                  pendingOfferSellerId: item.offerSellerId ?? "",
                  archived: item.archived ? "1" : "",
                },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isPending || (isFetching && !hasLoadedThreads) ? (
            <View style={styles.empty}>
              <StatusState
                eyebrow="Loading"
                title={mailbox === "archived" ? "Opening archived" : "Opening inbox"}
                body="Conversations and offers are loading."
              />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {mailbox === "archived" ? "NO ARCHIVED MESSAGES" : "NO MESSAGES YET"}
              </Text>
              <Text style={styles.emptySubtext}>
                {mailbox === "archived"
                  ? "Archived conversations will show up here."
                  : "Find a bike or builder, then start a real conversation."}
              </Text>
              {mailbox === "inbox" ? (
                <Pressable
                  style={styles.emptyButton}
                  onPress={() => router.replace("/(tabs)/shops")}
                >
                  <Text style={styles.emptyButtonText}>BROWSE BUILDERS</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  header: S.screenHeader,
  title: S.screenTitle,
  divider: S.divider,
  mailboxTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mailboxTab: {
    minHeight: 30,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
  },
  mailboxTabActive: {
    borderColor: COLORS.black,
    backgroundColor: COLORS.black,
  },
  mailboxTabText: {
    fontSize: 9,
    lineHeight: 12,
    fontFamily: F.monoBold,
    letterSpacing: 0.9,
    color: COLORS.textMuted,
  },
  mailboxTabTextActive: {
    color: COLORS.white,
  },
  list: {
    paddingVertical: SPACING.sm,
  },
  thread: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: SPACING.page,
    paddingVertical: 16,
  },
  avatar: {
    ...S.avatarBase,
    width: 40,
    height: 40,
    marginRight: SPACING.md,
    marginTop: 3,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  avatarText: {
    ...S.avatarText,
    fontSize: 16,
  },
  threadBody: {
    flex: 1,
  },
  threadTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  threadName: {
    ...TYPE.cardTitle,
    fontFamily: F.medium,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  threadNameUnread: {
    fontFamily: F.bold,
  },
  threadTime: {
    ...TYPE.monoSmall,
  },
  threadMessage: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  threadContext: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.monoBold,
    letterSpacing: 0.9,
    color: COLORS.textFaint,
    textTransform: "uppercase",
    marginTop: 3,
  },
  offerStatusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(228,0,43,0.08)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 6,
  },
  offerStatusPillAccepted: {
    backgroundColor: "rgba(22,138,15,0.08)",
  },
  offerStatusPillPending: {
    backgroundColor: "rgba(234,179,8,0.14)",
  },
  offerStatusPillDeclined: {
    backgroundColor: "rgba(228,0,43,0.08)",
  },
  offerStatusPillCancelled: {
    backgroundColor: COLORS.gray100,
  },
  offerStatusPillText: {
    fontSize: 9,
    lineHeight: 11,
    fontFamily: F.monoBold,
    letterSpacing: 0.6,
    color: COLORS.accent,
    textTransform: "uppercase",
  },
  offerStatusTextAccepted: {
    color: COLORS.success,
  },
  offerStatusTextPending: {
    color: "#9A6A00",
  },
  offerStatusTextDeclined: {
    color: COLORS.accent,
  },
  offerStatusTextCancelled: {
    color: COLORS.textMuted,
  },
  threadActions: {
    alignItems: "center",
    marginLeft: SPACING.sm,
  },
  threadMenuButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
    marginRight: -7,
  },
  unreadDot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.accent,
    marginTop: 4,
  },
  separator: {
    ...S.divider,
    marginLeft: SPACING.page + 40 + SPACING.md,
  },
  empty: S.emptyContainer,
  emptyText: S.emptyTitle,
  emptySubtext: S.emptyBody,
  emptyButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  emptyButtonText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.4,
    color: COLORS.white,
  },
});
