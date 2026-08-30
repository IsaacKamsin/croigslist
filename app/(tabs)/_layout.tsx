import { COLORS, F } from "@/constants/design";
import { useAuth } from "@/context/AuthContext";
import { hapticLight, hapticMedium } from "@/hooks/useHaptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { ChatTextIcon, GarageIcon, HouseIcon, UserIcon, WrenchIcon } from "phosphor-react-native";
import { useCallback, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";

const ACTIVE_BG_W = 38;
const ACTIVE_BG_H = 28;
const ICON_SIZE = 30;
const ICON_WEIGHT = "bold" as const;

const TAB_ICONS: Record<string, typeof HouseIcon> = {
  index: HouseIcon,
  shops: WrenchIcon,
  vault: GarageIcon,
  messages: ChatTextIcon,
  profile: UserIcon,
};

const BUILDER_TAB_ICONS: Record<string, typeof HouseIcon> = {
  index: WrenchIcon,
  shops: GarageIcon,
  vault: HouseIcon,
  messages: ChatTextIcon,
  profile: UserIcon,
};

function TabIcon({
  route,
  color,
  focused,
  isBuilder,
}: {
  route: string;
  color: string;
  focused: boolean;
  isBuilder: boolean;
}) {
  const Icon = isBuilder ? BUILDER_TAB_ICONS[route] : TAB_ICONS[route];
  if (!Icon) return null;

  if (focused) {
    return (
      <View
        style={{
          width: ACTIVE_BG_W,
          height: ACTIVE_BG_H,
          backgroundColor: "transparent",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Icon color={isBuilder ? COLORS.white : COLORS.black} size={ICON_SIZE} weight="fill" />
      </View>
    );
  }

  return <Icon color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
}

function ProfileTabButton(props: BottomTabBarButtonProps) {
  const { activeView, setActiveView } = useAuth();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["28%"], []);
  const openedSheetRef = useRef(false);
  const switchTarget = activeView === "buyer" ? "builder" : "buyer";
  const SwitchIcon = switchTarget === "buyer" ? HouseIcon : WrenchIcon;
  const switchTitle = switchTarget === "buyer" ? "Switch to Buy" : "Switch to Sell";
  const switchBody =
    switchTarget === "buyer"
      ? "Browse listings, save bikes, and message builders."
      : "Create listings, manage drafts, and respond to buyers.";
  const {
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    children,
    onPress,
    onPressIn,
    onPressOut,
    style,
    testID,
  } = props;

  const openSwitcher = () => {
    openedSheetRef.current = true;
    hapticMedium();
    sheetRef.current?.present();
  };

  const chooseView = (view: "buyer" | "builder") => {
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
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      style={style}
      testID={testID}
      delayLongPress={1500}
      onPress={(event) => {
        if (openedSheetRef.current) {
          openedSheetRef.current = false;
          return;
        }
        onPress?.(event);
      }}
      onLongPress={openSwitcher}
      onPressIn={(event) => {
        onPressIn?.(event);
        openedSheetRef.current = false;
      }}
      onPressOut={(event) => {
        onPressOut?.(event);
      }}
    >
      {children}
    </Pressable>
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={styles.sheetHandle}
      backgroundStyle={styles.sheetBg}
    >
        <BottomSheetView style={styles.sheet}>
          <Text style={styles.sheetEyebrow}>Mode</Text>
          <Text style={styles.sheetTitle}>
            {activeView === "buyer" ? "You are in Buy mode" : "You are in Sell mode"}
          </Text>

          <Pressable
            style={styles.viewOption}
            onPress={() => chooseView(switchTarget)}
          >
            <View style={styles.viewOptionIcon}>
              <SwitchIcon color={COLORS.black} size={22} weight="bold" />
            </View>
            <View style={styles.viewOptionTextWrap}>
              <Text style={styles.viewOptionTitle}>{switchTitle}</Text>
              <Text style={styles.viewOptionBody}>{switchBody}</Text>
            </View>
            <Text style={styles.viewOptionCheck}>GO</Text>
          </Pressable>
        </BottomSheetView>
    </BottomSheetModal>
    </>
  );
}

export default function TabsLayout() {
  const { activeView } = useAuth();
  const isBuilder = activeView === "builder";

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isBuilder ? COLORS.black : COLORS.bg,
          borderTopColor: COLORS.divider,
          borderTopWidth: 1,
          height: 96,
          paddingTop: 8,
          paddingBottom: 24,
        },
        tabBarActiveTintColor: isBuilder ? COLORS.white : COLORS.textPrimary,
        tabBarInactiveTintColor: isBuilder ? COLORS.whiteA35 : COLORS.textFaint,
        tabBarLabelStyle: {
          fontFamily: F.bold,
          fontSize: 13,
          letterSpacing: 0,
        },
        tabBarIcon: ({ color, focused }) => (
          <TabIcon route={route.name} color={color} focused={focused} isBuilder={isBuilder} />
        ),
      })}
      screenListeners={{
        tabPress: () => hapticLight(),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "HOME" }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="shops" options={{ title: isBuilder ? "LISTINGS" : "BUILDERS" }} />
      <Tabs.Screen
        name="vault"
        options={{
          title: "GARAGE",
          href: isBuilder ? null : undefined,
        }}
      />
      <Tabs.Screen name="messages" options={{ title: "MESSAGES" }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: "PROFILE",
          tabBarButton: (props) => <ProfileTabButton {...props} />,
        }}
      />
    </Tabs>
  );
}

const styles = {
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
  sheetHandle: {
    alignSelf: "center" as const,
    width: 44,
    height: 4,
    backgroundColor: COLORS.gray300,
    marginBottom: 18,
  },
  sheetEyebrow: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.8,
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
  },
  sheetTitle: {
    fontSize: 26,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
    marginBottom: 16,
  },
  viewOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: 14,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
  },
  viewOptionActive: {
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
  },
  viewOptionIcon: {
    width: 42,
    height: 42,
    backgroundColor: COLORS.accent,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  viewOptionTextWrap: {
    flex: 1,
  },
  viewOptionTitle: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  viewOptionBody: {
    fontSize: 12,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  viewOptionCheck: {
    width: 44,
    fontSize: 8,
    fontFamily: F.monoBold,
    letterSpacing: 0.8,
    color: COLORS.textPrimary,
    textAlign: "right" as const,
  },
};
