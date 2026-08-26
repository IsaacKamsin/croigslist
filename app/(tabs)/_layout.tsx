import { COLORS, F } from "@/constants/design";
import { hapticLight } from "@/hooks/useHaptics";
import { Tabs } from "expo-router";
import { ChatTextIcon, GarageIcon, HouseIcon, UserIcon, WrenchIcon } from "phosphor-react-native";
import { View } from "react-native";

const ACTIVE_BG_W = 38;
const ACTIVE_BG_H = 20;
const ICON_SIZE = 22;
const ICON_WEIGHT = "bold" as const;

const TAB_ICONS: Record<string, typeof HouseIcon> = {
  index: HouseIcon,
  shops: WrenchIcon,
  vault: GarageIcon,
  messages: ChatTextIcon,
  profile: UserIcon,
};

function TabIcon({
  route,
  color,
  focused,
}: {
  route: string;
  color: string;
  focused: boolean;
}) {
  const Icon = TAB_ICONS[route];
  if (!Icon) return null;

  if (focused) {
    return (
      <View
        style={{
          width: ACTIVE_BG_W,
          height: ACTIVE_BG_H,
          borderRadius: 4,
          backgroundColor: COLORS.accent,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Icon color={COLORS.black} size={ICON_SIZE} weight={ICON_WEIGHT} />
      </View>
    );
  }

  return <Icon color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopColor: COLORS.divider,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: COLORS.textPrimary,
        tabBarInactiveTintColor: COLORS.textFaint,
        tabBarLabelStyle: {
          fontFamily: F.monoMedium,
          fontSize: 9,
          letterSpacing: 0.8,
        },
        tabBarIcon: ({ color, focused }) => (
          <TabIcon route={route.name} color={color} focused={focused} />
        ),
      })}
      screenListeners={{
        tabPress: () => hapticLight(),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "REGISTRY" }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="shops" options={{ title: "BUILDERS" }} />
      <Tabs.Screen name="vault" options={{ title: "GARAGE" }} />
      <Tabs.Screen name="messages" options={{ title: "MESSAGES" }} />
      <Tabs.Screen name="profile" options={{ title: "PROFILE" }} />
    </Tabs>
  );
}
