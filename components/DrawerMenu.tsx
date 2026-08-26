import { COLORS, F, SPACING, TYPE } from "@/constants/design";
import { S } from "@/constants/styles";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { key: "profile", label: "PROFILE", route: "/(tabs)/profile" },
  { key: "listings", label: "MY LISTINGS", route: "/(tabs)/search" },
  { key: "saved", label: "SAVED", route: "/(tabs)/vault" },
  { key: "settings", label: "ACCOUNT SETTINGS", route: "/(tabs)/search" },
  { key: "membership", label: "MEMBERSHIP", route: "/(tabs)/search" },
];

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(visible);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { member, signOut } = useAuth();

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH - DRAWER_WIDTH,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setIsMounted(false));
    }
  }, [visible]);

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 300);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            onClose();
            setTimeout(() => signOut(), 300);
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member?.name?.[0] ?? "M"}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{member?.name ?? "Member"}</Text>
              <View style={styles.metaRow}>
                {member?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>VERIFIED</Text>
                  </View>
                )}
                <Text style={styles.memberType}>
                  {member?.type?.toUpperCase() ?? "RIDER"}
                </Text>
              </View>
              <Text style={styles.memberMeta}>
                {member?.city?.toUpperCase() ?? "MINNEAPOLIS"} · SINCE{" "}
                {member?.memberSince ?? "2026"}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatBlock label="LISTINGS" value="0" />
            <StatBlock label="SOLD" value="0" />
            <StatBlock label="RESPONSES" value="—" />
          </View>

          <View style={styles.divider} />

          {/* Menu */}
          <View>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.key}
                style={styles.menuRow}
                onPress={() => handleNavigate(item.route)}
              >
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuArrow}>→</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Bottom */}
        <View style={styles.bottom}>
          <View style={styles.divider} />
          <Pressable style={styles.signOutRow} onPress={handleSignOut}>
            <Text style={styles.signOutText}>SIGN OUT</Text>
          </Pressable>
          <Text style={styles.version}>CROIGSLIST V1.0.0</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26,26,24,0.35)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.page,
    borderLeftWidth: 0.5,
    borderLeftColor: COLORS.divider,
  },

  // Close
  closeBtn: {
    alignSelf: "flex-end",
    padding: 4,
    marginBottom: SPACING.md,
  },
  closeText: {
    fontSize: 18,
    fontFamily: F.light,
    color: COLORS.textMuted,
  },

  // Profile
  profileHeader: {
    flexDirection: "row",
    gap: SPACING.md,
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  avatar: {
    ...S.avatarBase,
    width: 48,
    height: 48,
  },
  avatarText: {
    ...S.avatarText,
    fontSize: 18,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: 3,
  },
  verifiedBadge: S.verifiedBadge,
  verifiedText: S.verifiedText,
  memberType: {
    ...TYPE.monoSmall,
    fontFamily: F.monoMedium,
    letterSpacing: 1.5,
  },
  memberMeta: {
    ...TYPE.monoSmall,
    fontSize: 9,
    letterSpacing: 1,
    color: COLORS.textFaint,
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingVertical: SPACING.md,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.divider,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.divider,
    marginBottom: SPACING.md,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    ...TYPE.label,
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 3,
  },

  // Menu
  divider: S.divider,
  menuRow: S.menuRow,
  menuLabel: S.menuLabel,
  menuArrow: S.menuArrow,

  // Bottom
  bottom: {
    marginTop: SPACING.sm,
  },
  signOutRow: {
    paddingVertical: SPACING.md,
  },
  signOutText: {
    ...TYPE.monoSmall,
    fontFamily: F.monoMedium,
    letterSpacing: 2,
  },
  version: {
    ...TYPE.monoSmall,
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLORS.textFaint,
    marginTop: SPACING.sm,
  },
});
