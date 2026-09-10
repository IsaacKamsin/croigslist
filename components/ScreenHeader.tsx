/**
 * Shared screen header for tab screens.
 */
import { COLORS, F, SPACING } from "@/constants/design";
import { StyleSheet, Text, View } from "react-native";

export function ScreenHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        <View style={s.actions}>
          {right}
        </View>
      </View>
      <View style={s.divider} />
    </>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.page,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: F.semibold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  divider: {
    height: 0.5,
    backgroundColor: COLORS.divider,
  },
});
