import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { hapticLight, hapticWarning } from '@/hooks/useHaptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { COLORS, F, SPACING, TYPE } from '@/constants/design';
import { S } from '@/constants/styles';
import { ShareNetworkIcon } from 'phosphor-react-native';
import { fetchGarageBikes } from '@/lib/garage-db';
import { fetchMyListings } from '@/lib/registry-db';
import { fetchMessageThreads } from '@/lib/messages-db';
import { useQuery } from '@tanstack/react-query';
import { shareBuyerInvite, shareSellerInvite } from '@/lib/share';

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  label,
  subtitle,
  onPress,
}: {
  label: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.menuArrow}>→</Text>
    </Pressable>
  );
}

function ShareInviteRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={styles.compactQrRow}
      onPress={onPress}
    >
      <ShareNetworkIcon size={16} color={COLORS.textFaint} weight="bold" />
      <Text style={styles.compactQrText}>SHARE INVITE</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { activeView, member, signOut, setActiveView } = useAuth();
  const router = useRouter();
  const isBuilder = activeView === 'builder';
  const { data: stats } = useQuery({
    queryKey: ['profile-stats', member?.id],
    queryFn: async () => {
      const [garageBikes, listings, threads] = await Promise.all([
        fetchGarageBikes().catch(() => []),
        fetchMyListings().catch(() => []),
        fetchMessageThreads().catch(() => []),
      ]);
      return {
        garageCount: garageBikes.length,
        listingCount: listings.length,
        soldCount: listings.filter((listing) => listing.status === 'sold').length,
        messageCount: threads.length,
      };
    },
    initialData: {
      garageCount: 0,
      listingCount: 0,
      soldCount: 0,
      messageCount: 0,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="PROFILE" />

        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{member?.name?.[0] ?? 'M'}</Text>
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.name}>{member?.name ?? 'Member'}</Text>
              <Text style={styles.memberSince}>
                {isBuilder ? 'SELL' : 'BUY'} MODE · {member?.memberSince ?? '2026'}
              </Text>
              {member?.city ? (
                <Text style={styles.city}>{member.city.toUpperCase()}</Text>
              ) : null}
            </View>
            {member?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            )}
          </View>

          <View style={styles.quickActions}>
            <ShareInviteRow
              onPress={() => {
                hapticLight();
                if (isBuilder) {
                  shareBuyerInvite();
                } else {
                  shareSellerInvite();
                }
              }}
            />
          </View>

          <View style={styles.statsRow}>
            <StatBlock
              label={isBuilder ? 'LISTINGS' : 'GARAGE'}
              value={String(isBuilder ? stats.listingCount : stats.garageCount)}
            />
            <StatBlock label={isBuilder ? 'SOLD' : 'MESSAGES'} value={String(isBuilder ? stats.soldCount : stats.messageCount)} />
            <StatBlock label={isBuilder ? 'DRAFTS' : 'WATCHING'} value={String(isBuilder ? 0 : stats.garageCount)} />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Menu */}
        <View style={styles.menu}>
          {isBuilder ? (
            <>
              <MenuRow label="BUYER VIEW" onPress={() => {
                hapticLight();
                setActiveView('buyer');
                router.replace('/(tabs)');
              }} />
              <MenuRow
                label="CHANGE GARAGE DETAILS"
                subtitle="Contact info, city, bio, and public profile"
                onPress={() => {
                  hapticLight();
                  router.push('/garage/details');
                }}
              />
              <MenuRow
                label="MY LISTINGS"
                subtitle="Active, sold, and draft bikes"
                onPress={() => {
                  hapticLight();
                  router.replace('/(tabs)/shops');
                }}
              />
              <MenuRow label="LIST A BIKE" onPress={() => router.push('/listing/create')} />
              <MenuRow
                label="INVITE BUYERS"
                subtitle="Share the registry with riders"
                onPress={() => {
                  hapticLight();
                  shareBuyerInvite();
                }}
              />
            </>
          ) : (
            <>
              <MenuRow label="SELLER VIEW" onPress={() => {
                hapticLight();
                setActiveView('builder');
                router.replace('/(tabs)');
              }} />
              <MenuRow
                label="DREAM GARAGE"
                subtitle="Saved bikes and bike scans"
                onPress={() => {
                  hapticLight();
                  router.replace('/(tabs)/vault');
                }}
              />
              <MenuRow
                label="SEARCH"
                subtitle="Find listings by year, make, or model"
                onPress={() => {
                  hapticLight();
                  router.replace('/(tabs)/search');
                }}
              />
              <MenuRow
                label="INVITE A SELLER"
                subtitle="Bring more bikes into the registry"
                onPress={() => {
                  hapticLight();
                  shareSellerInvite();
                }}
              />
            </>
          )}
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
  summary: {
    paddingHorizontal: SPACING.page,
    paddingBottom: SPACING.xl,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.lg,
  },
  summaryText: {
    flex: 1,
  },
  avatarLarge: {
    ...S.avatarBase,
    width: 86,
    height: 86,
  },
  avatarLargeText: {
    ...S.avatarText,
    fontSize: 36,
  },
  name: {
    ...TYPE.sectionHeader,
    fontSize: 28,
    letterSpacing: 0,
  },
  verifiedBadge: S.verifiedBadge,
  verifiedText: S.verifiedText,
  memberSince: {
    fontSize: 16,
    fontFamily: F.semibold,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  city: {
    fontSize: 15,
    fontFamily: F.semibold,
    letterSpacing: 0,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  switchButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.black,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchButtonText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textPrimary,
  },
  compactQrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  compactQrText: {
    fontSize: 15,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    borderWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.divider,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
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
    paddingVertical: 20,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: S.menuLabel,
  menuSubtitle: {
    fontSize: 15,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 4,
    letterSpacing: 0,
  },
  menuArrow: S.menuArrow,
  signOutButton: {
    marginHorizontal: SPACING.page,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.black,
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 17,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
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
