import { COLORS, F, SPACING } from "@/constants/design";
import { useAuth } from "@/context/AuthContext";
import { hapticLight } from "@/hooks/useHaptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import {
  CameraIcon,
  ImageSquareIcon,
  LinkIcon,
  PencilSimpleIcon,
  ChartLineUpIcon,
} from "phosphor-react-native";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ListBikeSheetRef = {
  open: () => void;
  close: () => void;
};

type CreateMode = "photo" | "library" | "import" | "manual";

type ListBikeSheetProps = {
  showDashboardOption?: boolean;
  onOpenDashboard?: () => void;
};

const OPTIONS: {
  key: CreateMode;
  title: string;
  body: string;
  Icon: typeof CameraIcon;
}[] = [
  {
    key: "photo",
    title: "Take photo",
    body: "Start with a fresh bike photo.",
    Icon: CameraIcon,
  },
  {
    key: "library",
    title: "Choose photo",
    body: "Use photos already on your phone.",
    Icon: ImageSquareIcon,
  },
  {
    key: "import",
    title: "Import listing",
    body: "Paste a marketplace link.",
    Icon: LinkIcon,
  },
  {
    key: "manual",
    title: "Manual listing",
    body: "Enter specs, price, and photos yourself.",
    Icon: PencilSimpleIcon,
  },
];

export const ListBikeSheet = forwardRef<ListBikeSheetRef, ListBikeSheetProps>(function ListBikeSheet(
  { showDashboardOption = false, onOpenDashboard },
  ref,
) {
  const router = useRouter();
  const { memberStatus } = useAuth();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(
    () => [showDashboardOption ? "74%" : "64%"],
    [showDashboardOption],
  );
  const insets = useSafeAreaInsets();

  const close = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const open = useCallback(() => {
    hapticLight();
    if (memberStatus !== "approved") {
      router.push({
        pathname: "/payment",
        params: { returnTo: "/listing/create?mode=manual&source=manual" },
      });
      return;
    }
    sheetRef.current?.present();
  }, [memberStatus, router]);

  useImperativeHandle(ref, () => ({ open, close }), [close, open]);

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

  const startListing = (mode: CreateMode) => {
    hapticLight();
    close();
    router.push({
      pathname: "/listing/create",
      params: {
        mode: mode === "import" ? "import" : "manual",
        source: mode,
      },
    });
  };

  const openDashboard = () => {
    hapticLight();
    close();
    onOpenDashboard?.();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={styles.sheetHandle}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetView
        style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}
      >
        <Text style={styles.sheetEyebrow}>Sell bike</Text>
        <Text style={styles.sheetTitle}>Start a listing</Text>
        <View style={styles.options}>
          {showDashboardOption && onOpenDashboard ? (
            <Pressable style={styles.option} onPress={openDashboard}>
              <View style={styles.optionIcon}>
                <ChartLineUpIcon color={COLORS.black} size={21} weight="bold" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Seller dashboard</Text>
                <Text style={styles.optionBody}>Manage listings, offers, and earnings.</Text>
              </View>
            </Pressable>
          ) : null}
          {OPTIONS.map(({ key, title, body, Icon }) => (
            <Pressable
              key={key}
              style={styles.option}
              onPress={() => startListing(key)}
            >
              <View style={styles.optionIcon}>
                <Icon color={COLORS.black} size={21} weight="bold" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{title}</Text>
                <Text style={styles.optionBody}>{body}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    paddingBottom: 34,
  },
  sheetBg: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    backgroundColor: COLORS.gray300,
    marginBottom: 18,
  },
  sheetEyebrow: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: F.monoBold,
    letterSpacing: 1.4,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  sheetTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
    marginTop: 4,
    marginBottom: 14,
  },
  options: {
    gap: 10,
  },
  option: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceRaised,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    lineHeight: 19,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
  },
  optionBody: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
