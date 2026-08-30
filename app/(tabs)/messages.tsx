import { ScreenHeader } from "@/components/ScreenHeader";
import { COLORS, F, SPACING, TYPE } from "@/constants/design";
import { S } from "@/constants/styles";
import { fetchMessageThreads, type MessageThread } from "@/lib/messages-db";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ThreadRow({
  item,
  onPress,
}: {
  item: MessageThread;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.thread} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0]}</Text>
      </View>

      <View style={styles.threadBody}>
        <View style={styles.threadTop}>
          <Text
            style={[styles.threadName, item.unread && styles.threadNameUnread]}
          >
            {item.name}
          </Text>
          <Text style={styles.threadTime}>{item.time}</Text>
        </View>
        <Text style={styles.threadMessage} numberOfLines={1}>
          {item.last}
        </Text>
      </View>

      {item.unread && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { data: threads } = useQuery({
    queryKey: ["message-threads"],
    queryFn: fetchMessageThreads,
    initialData: [] as MessageThread[],
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="MESSAGES" />

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ThreadRow
            item={item}
            onPress={() =>
              router.push({
                pathname: "/messages/[id]",
                params: { id: item.id, sellerName: item.name },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>NO MESSAGES YET</Text>
            <Text style={styles.emptySubtext}>
              Find a bike or builder, then start a real conversation.
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => router.replace("/(tabs)/shops")}
            >
              <Text style={styles.emptyButtonText}>BROWSE BUILDERS</Text>
            </Pressable>
          </View>
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
  list: {
    paddingVertical: SPACING.sm,
  },
  thread: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.page,
    paddingVertical: SPACING.md,
  },
  avatar: {
    ...S.avatarBase,
    width: 40,
    height: 40,
    marginRight: SPACING.md,
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
  },
  threadNameUnread: {
    fontFamily: F.bold,
  },
  threadTime: {
    ...TYPE.monoSmall,
  },
  threadMessage: {
    ...TYPE.bodySmall,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.accent,
    marginLeft: SPACING.sm,
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
