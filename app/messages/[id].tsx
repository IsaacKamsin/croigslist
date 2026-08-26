import { COLORS, F, SPACING } from "@/constants/design";
import { hapticLight } from "@/hooks/useHaptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Mock shop meta — replace with API/store lookup ────────────────
const SHOP_META: Record<string, { name: string; initials: string }> = {
  "reincarnation-cycles": { name: "Reincarnation Cycles", initials: "RC" },
};

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  time: string;
}

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    text: "Hey! Interested in the CB550 Cafe — is it still available?",
    fromMe: true,
    time: "2h",
  },
  {
    id: "2",
    text: "Yeah it's still here. You want to come take a look?",
    fromMe: false,
    time: "1h",
  },
  {
    id: "3",
    text: "Definitely. What days work for you?",
    fromMe: true,
    time: "45m",
  },
];

// ── Bubble ────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
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

// ── Screen ────────────────────────────────────────────────────────
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const shop = SHOP_META[id ?? ""] ?? { name: id ?? "Shop", initials: "?" };

  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList>(null);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    hapticLight();
    const msgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: msgId, text, fromMe: true, time: "sending..." },
    ]);
    setDraft("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    // Simulate send confirmation
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, time: "now" } : m)),
      );
    }, 800);
  }, [draft]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ BACK</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{shop.initials}</Text>
          </View>
          <Text style={styles.headerName}>{shop.name.toUpperCase()}</Text>
        </View>

        <View style={styles.backBtn} />
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
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />

        <View style={styles.compose}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message..."
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.page,
    paddingVertical: 14,
  },
  backBtn: { width: 60 },
  backText: {
    fontSize: 11,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.accent,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 12,
    fontFamily: F.monoBold,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  headerName: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.textPrimary,
  },
  divider: { height: 0.5, backgroundColor: COLORS.divider },

  // Messages
  messageList: {
    paddingHorizontal: SPACING.page,
    paddingVertical: SPACING.lg,
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
  bubbleTextMe: { color: COLORS.black },
  bubbleTime: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  bubbleTimeMe: { textAlign: "right" },

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
    fontSize: 13,
    fontFamily: F.mono,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
