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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontFamily: F.bold,
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
