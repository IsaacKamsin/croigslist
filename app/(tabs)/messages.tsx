import { ScreenHeader } from "@/components/ScreenHeader";
import { COLORS, F, SPACING, TYPE } from "@/constants/design";
import { S } from "@/constants/styles";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MOCK_THREADS = [
  {
    id: "1",
    name: "Jake Morrison",
    lastMessage: "Is the CB550 still available?",
    time: "2h",
    unread: true,
  },
  {
    id: "2",
    name: "Twin Cities Moto Co.",
    lastMessage: "We can have the carbs rebuilt by Friday.",
    time: "1d",
    unread: false,
  },
  {
    id: "3",
    name: "Maria Chen",
    lastMessage: "Sent you the title photos.",
    time: "3d",
    unread: false,
  },
];

function ThreadRow({ item }: { item: (typeof MOCK_THREADS)[0] }) {
  return (
    <Pressable style={styles.thread}>
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
          {item.lastMessage}
        </Text>
      </View>

      {item.unread && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="MESSAGES" />

      <FlatList
        data={MOCK_THREADS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ThreadRow item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>NO MESSAGES YET</Text>
            <Text style={styles.emptySubtext}>
              Real conversations between real people. Find a bike, message the seller — no bots, no dealers, no noise.
            </Text>
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
});
