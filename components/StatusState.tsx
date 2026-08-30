import { COLORS, F, SPACING, TYPE } from "@/constants/design";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function StatusState({
  eyebrow,
  title,
  body,
  actionLabel,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.action} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.page,
    paddingBottom: 80,
  },
  eyebrow: {
    ...TYPE.label,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  body: {
    ...TYPE.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    maxWidth: 320,
  },
  action: {
    alignSelf: "flex-start",
    marginTop: SPACING.lg,
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.white,
  },
});
