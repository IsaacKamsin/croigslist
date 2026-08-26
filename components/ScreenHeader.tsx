/**
 * Shared screen header with optional search icon (top-right).
 * Use on every tab screen to provide consistent search access.
 */
import { COLORS, F, SPACING } from "@/constants/design";
import { hapticLight } from "@/hooks/useHaptics";
import { useRouter } from "expo-router";
import { MagnifyingGlassIcon } from "phosphor-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function ScreenHeader({
  title,
  showSearch = true,
  right,
}: {
  title: string;
  showSearch?: boolean;
  right?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        <View style={s.actions}>
          {right}
          {showSearch && (
            <Pressable
              style={s.searchBtn}
              onPress={() => {
                hapticLight();
                router.push("/(tabs)/search");
              }}
              hitSlop={8}
            >
              <MagnifyingGlassIcon
                color={COLORS.textPrimary}
                size={20}
                weight="bold"
              />
            </Pressable>
          )}
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
    fontSize: 20,
    fontFamily: F.bold,
    letterSpacing: 4,
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  searchBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 0.5,
    backgroundColor: COLORS.divider,
  },
});
