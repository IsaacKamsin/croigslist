import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { hapticLight, hapticWarning } from '@/hooks/useHaptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { COLORS, F, SPACING, TYPE } from '@/constants/design';
import { S } from '@/constants/styles';
import { QrCodeIcon, StarIcon, ShareNetworkIcon } from 'phosphor-react-native';

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>→</Text>
    </Pressable>
  );
}

// ── Garage Rating ───────────────────────────────────────────────────
function GarageRating({ rating }: { rating: number }) {
  return (
    <View style={styles.ratingWrap}>
      <View style={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon
            key={i}
            size={14}
            weight={i <= Math.round(rating) ? "fill" : "regular"}
            color={i <= Math.round(rating) ? COLORS.accent : COLORS.textFaint}
          />
        ))}
      </View>
      <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
      <Text style={styles.ratingLabel}>GARAGE RATING</Text>
    </View>
  );
}

// ── QR Code Placeholder ─────────────────────────────────────────────
function QRCodeCard({ name }: { name: string }) {
  return (
    <Pressable
      style={styles.qrCard}
      onPress={() => {
        hapticLight();
        // TODO: open full-screen QR modal
      }}
    >
      <View style={styles.qrPlaceholder}>
        <QrCodeIcon size={48} color={COLORS.whiteA50} weight="regular" />
      </View>
      <View style={styles.qrInfo}>
        <Text style={styles.qrTitle}>YOUR MEMBER QR</Text>
        <Text style={styles.qrSub}>
          Let other members scan to find your profile and garage.
        </Text>
      </View>
      <ShareNetworkIcon size={18} color={COLORS.textFaint} weight="bold" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { member, signOut } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="PROFILE" />

        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{member?.name?.[0] ?? 'M'}</Text>
          </View>
          <Text style={styles.name}>{member?.name ?? 'Member'}</Text>
          <View style={styles.verifiedRow}>
            {member?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            )}
            <Text style={styles.memberType}>
              {member?.type?.toUpperCase() ?? 'RIDER'}
            </Text>
          </View>
          <Text style={styles.memberSince}>
            MEMBER SINCE {member?.memberSince ?? '2026'} · {member?.city?.toUpperCase() ?? 'MINNEAPOLIS'}
          </Text>
        </View>

        {/* Garage Rating */}
        <GarageRating rating={4.7} />

        {/* Membership card */}
        <View style={styles.memberCard}>
          <View style={styles.memberCardHeader}>
            <Text style={styles.memberCardLogo}>CROIGSLIST</Text>
            <Text style={styles.memberCardBadge}>MEMBER</Text>
          </View>
          <Text style={styles.memberCardName}>{member?.name ?? 'Member'}</Text>
          <Text style={styles.memberCardDetail}>
            {member?.city?.toUpperCase() ?? 'MINNEAPOLIS'} · {member?.type?.toUpperCase() ?? 'RIDER'} · {member?.memberSince ?? '2026'}
          </Text>
        </View>

        {/* QR Code */}
        <QRCodeCard name={member?.name ?? 'Member'} />

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBlock label="LISTINGS" value="0" />
          <StatBlock label="SOLD" value="0" />
          <StatBlock label="RATING" value="4.7" />
        </View>

        <View style={styles.divider} />

        {/* Menu */}
        <View style={styles.menu}>
          <MenuRow label="VIEW PUBLIC PROFILE" onPress={() => {
            hapticLight();
            router.push(`/builder/${member?.id ?? '1'}`);
          }} />
          <MenuRow label="MY LISTINGS" />
          <MenuRow label="SAVED" />
          <MenuRow label="ACCOUNT SETTINGS" />
          <MenuRow label="MEMBERSHIP" />
        </View>

        <View style={styles.divider} />

        <Pressable style={styles.signOutButton} onPress={() => {
          hapticWarning();
          Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ],
          );
        }}>
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </Pressable>

        <Text style={styles.version}>CROIGSLIST V1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  divider: S.divider,
  identity: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  avatarLarge: {
    ...S.avatarBase,
    width: 72,
    height: 72,
    marginBottom: SPACING.md,
  },
  avatarLargeText: {
    ...S.avatarText,
    fontSize: 28,
  },
  name: {
    ...TYPE.sectionHeader,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  verifiedBadge: S.verifiedBadge,
  verifiedText: S.verifiedText,
  memberType: {
    ...TYPE.monoSmall,
    fontFamily: F.monoSemiBold,
    letterSpacing: 2,
    color: COLORS.textSecondary,
  },
  memberSince: {
    ...TYPE.monoSmall,
    letterSpacing: 1.5,
    marginTop: SPACING.sm,
  },

  // Garage rating
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingValue: {
    fontSize: 14,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  ratingLabel: {
    fontSize: 9,
    fontFamily: F.monoMedium,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
  },

  // Membership card
  memberCard: {
    marginHorizontal: SPACING.page,
    backgroundColor: COLORS.black,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  memberCardLogo: {
    fontSize: 10,
    fontFamily: F.bold,
    letterSpacing: 3,
    color: COLORS.whiteA30,
  },
  memberCardBadge: {
    fontSize: 8,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.black,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  memberCardName: {
    fontSize: 20,
    fontFamily: F.bold,
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  memberCardDetail: {
    fontSize: 9,
    fontFamily: F.mono,
    letterSpacing: 1.5,
    color: COLORS.whiteA35,
    marginTop: SPACING.sm,
  },

  // QR Code card
  qrCard: {
    marginHorizontal: SPACING.page,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  qrPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrInfo: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.textPrimary,
  },
  qrSub: {
    fontSize: 12,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginTop: SPACING.xs,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.page,
    paddingVertical: SPACING.lg,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.divider,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    ...TYPE.label,
    letterSpacing: 2,
    marginTop: 4,
  },
  menu: {
    paddingVertical: SPACING.sm,
  },
  menuRow: {
    ...S.menuRow,
    paddingHorizontal: SPACING.page,
  },
  menuLabel: S.menuLabel,
  menuArrow: S.menuArrow,
  signOutButton: {
    marginHorizontal: SPACING.page,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  signOutText: {
    ...TYPE.mono,
    fontFamily: F.monoSemiBold,
    letterSpacing: 2,
    color: COLORS.textSecondary,
  },
  version: {
    ...TYPE.monoSmall,
    letterSpacing: 1.5,
    color: COLORS.textFaint,
    textAlign: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
});
