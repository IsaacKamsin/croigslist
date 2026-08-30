import { COLORS, F } from "@/constants/design";
import { useAuth } from "@/context/AuthContext";
import { hapticMedium } from "@/hooks/useHaptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function ViewModeBadge() {
  const { activeView, setActiveView } = useAuth();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["38%"], []);
  const isBuilder = activeView === "builder";

  const choose = (view: "buyer" | "builder") => {
    hapticMedium();
    setActiveView(view);
    sheetRef.current?.dismiss();
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
      />
    ),
    [],
  );

  return (
    <>
      <Pressable
        style={[s.badge, isBuilder ? s.sellBadge : s.buyBadge]}
        onPress={() => {
          hapticMedium();
          sheetRef.current?.present();
        }}
        hitSlop={8}
      >
        <Text style={[s.text, isBuilder ? s.sellText : null]}>
          {isBuilder ? "SELL" : "BUY"}
        </Text>
      </Pressable>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        handleIndicatorStyle={s.handle}
        backgroundStyle={s.sheetBg}
      >
        <BottomSheetView style={s.sheet}>
          <Text style={s.eyebrow}>Mode</Text>
          <Text style={s.title}>Switch between Buy and Sell</Text>
          <Pressable
            style={[s.option, !isBuilder ? s.optionActive : null]}
            onPress={() => choose("buyer")}
          >
            <View>
              <Text style={s.optionTitle}>Buy</Text>
              <Text style={s.optionBody}>Browse listings, save bikes, and message builders.</Text>
            </View>
            <Text style={s.optionStatus}>{!isBuilder ? "ACTIVE" : ""}</Text>
          </Pressable>
          <Pressable
            style={[s.option, isBuilder ? s.optionActive : null]}
            onPress={() => choose("builder")}
          >
            <View>
              <Text style={s.optionTitle}>Sell</Text>
              <Text style={s.optionBody}>Create listings, manage drafts, and respond to buyers.</Text>
            </View>
            <Text style={s.optionStatus}>{isBuilder ? "ACTIVE" : ""}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const s = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderColor: COLORS.black,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  buyBadge: {
    backgroundColor: COLORS.accent,
  },
  sellBadge: {
    backgroundColor: COLORS.black,
  },
  text: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 1.1,
    color: COLORS.black,
  },
  sellText: {
    color: COLORS.accent,
  },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 34,
  },
  sheetBg: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 2,
    borderTopColor: COLORS.black,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    backgroundColor: COLORS.gray300,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.8,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: 14,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
  },
  optionActive: {
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  optionBody: {
    fontSize: 12,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginTop: 2,
    maxWidth: 250,
  },
  optionStatus: {
    width: 44,
    fontSize: 8,
    fontFamily: F.monoBold,
    letterSpacing: 0.8,
    color: COLORS.textPrimary,
    textAlign: "right",
  },
});
