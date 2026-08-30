import { StatusState } from "@/components/StatusState";
import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { startConversation } from "@/lib/messages-db";
import { fetchShopBySlug } from "@/lib/registry-db";
import { formatUsd } from "@/lib/formatters";
import { backOrReplace } from "@/lib/navigation";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ── Main Screen ──────────────────────────────────────────────────────

export default function ShopScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data: shop, isPending } = useQuery({
    queryKey: ["shop", slug],
    queryFn: () => fetchShopBySlug(slug),
    enabled: Boolean(slug),
  });

  const handleMessage = useCallback(async () => {
    if (!shop) return;
    const conversationId = await startConversation({
      participantId: shop.id,
      participantName: shop.name,
    });
    router.push({
      pathname: "/messages/[id]",
      params: { id: conversationId, sellerName: shop.name },
    });
  }, [shop, router]);

  const handleWeb = useCallback(() => {
    if (shop?.website) Linking.openURL(`https://${shop.website}`);
  }, [shop?.website]);

  const handleCall = useCallback(() => {
    if (shop?.phone) Linking.openURL(`tel:${shop.phone.replace(/-/g, "")}`);
  }, [shop?.phone]);

  const goListing = useCallback(
    (id: string) => router.push(`/listing/${id}`),
    [router],
  );

  if (isPending) {
    return (
      <View style={styles.container}>
        <StatusState eyebrow="Loading" title="Opening shop" />
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.container}>
        <StatusState
          eyebrow="Not found"
          title="Shop unavailable"
          body="This shop may have been removed or the link is no longer valid."
          actionLabel="GO BACK"
          onAction={() => backOrReplace(router, "/(tabs)")}
        />
      </View>
    );
  }

  const builds = shop.listings ?? [];
  const buildStyles = shop.buildStyles ?? [];
  const badges = shop.badges ?? [];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── HERO ── */}
        <View style={styles.hero}>
          <Text style={styles.heroTopline}>CROIGSLIST VERIFIED SHOP</Text>
          <Text style={styles.heroName}>{shop.name}</Text>
          <Text style={styles.heroTagline}>{shop.tagline}</Text>

          <View style={styles.badgeRow}>
            {shop.verified && (
              <View style={[styles.badge, styles.badgeFilled]}>
                <Text style={[styles.badgeText, styles.badgeTextFilled]}>
                  ✓ VERIFIED BUILDER
                </Text>
              </View>
            )}
            {badges.map((b) => (
              <View key={b} style={[styles.badge, styles.badgeOutline]}>
                <Text style={[styles.badgeText, styles.badgeTextOutline]}>
                  {b.toUpperCase()}
                </Text>
              </View>
            ))}
            {shop.appointmentOnly && (
              <View style={[styles.badge, styles.badgeMuted]}>
                <Text style={[styles.badgeText, styles.badgeTextMuted]}>
                  BY APPOINTMENT
                </Text>
              </View>
            )}
          </View>

          {/* Contact info in hero */}
          <View style={styles.heroDivider} />
          <View style={styles.heroContact}>
            {shop.address && (
              <Text style={styles.heroContactText}>{shop.address}</Text>
            )}
            {shop.phone && (
              <Pressable onPress={handleCall}>
                <Text style={styles.heroContactLink}>{shop.phone}</Text>
              </Pressable>
            )}
            {shop.website && (
              <Pressable onPress={handleWeb}>
                <Text style={styles.heroContactLink}>{shop.website}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── BUILD STYLE TAGS ── */}
        <View style={styles.styleRow}>
          {buildStyles.map((style) => (
            <View key={style} style={styles.styleChip}>
              <View style={styles.styleIcon}>
                <Text style={styles.styleIconDot}>●</Text>
              </View>
              <Text style={styles.styleLabel}>{style.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* ── BUILDS ── */}
        <View style={styles.buildsSection}>
          <View style={styles.buildsHeader}>
            <Text style={styles.buildsTitle}>BUILDS</Text>
            <Text style={styles.buildsCount}>{builds.length}</Text>
          </View>
          {builds.length === 0 ? (
            <View style={styles.emptyBuilds}>
              <Text style={styles.emptyBuildsTitle}>No listings yet</Text>
              <Text style={styles.emptyBuildsBody}>
                Message the shop or check back when inventory is live.
              </Text>
            </View>
          ) : (
            <FlatList
              horizontal
              data={builds}
              keyExtractor={(i) => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.buildsScroll}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.buildCard}
                  onPress={() => goListing(item.id)}
                >
                  <View style={styles.buildImgWrap}>
                    <Image
                      source={{ uri: item.image }}
                      style={styles.buildImg}
                      contentFit="cover"
                      cachePolicy={IMAGE_CACHE}
                      recyclingKey={item.image}
                    />
                  </View>
                  <Text style={styles.buildMeta}>
                    {item.year} · {item.make}
                  </Text>
                  <Text style={styles.buildModel}>{item.model}</Text>
                  <Text style={styles.buildPrice}>
                    {formatUsd(item.price)}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* ── PINNED MESSAGE BUTTON ── */}
      <View style={styles.messageBar}>
        <Pressable style={styles.messageBtn} onPress={handleMessage}>
          <Text style={styles.messageBtnText}>MESSAGE SHOP</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const CARD_W = 170;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },

  // ── Hero ──
  hero: {
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  heroTopline: {
    fontSize: 10,
    fontFamily: F.mono,
    letterSpacing: 3,
    color: COLORS.accent,
    opacity: 0.7,
    marginBottom: 6,
  },
  heroName: {
    fontSize: 36,
    fontFamily: F.bold,
    letterSpacing: 0,
    lineHeight: 38,
    color: COLORS.white,
    marginBottom: 4,
  },
  heroTagline: {
    fontSize: 13,
    fontFamily: F.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 20,
  },

  // ── Badges ──
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 0,
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  badgeFilled: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  badgeOutline: {
    borderColor: COLORS.accent,
  },
  badgeMuted: {
    borderColor: COLORS.textMuted,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: F.mono,
    letterSpacing: 1.5,
  },
  badgeTextFilled: {
    color: COLORS.black,
    fontFamily: F.monoBold,
  },
  badgeTextOutline: {
    color: COLORS.accent,
  },
  badgeTextMuted: {
    color: COLORS.textMuted,
  },

  // ── Hero contact ──
  heroDivider: {
    height: 0.5,
    backgroundColor: COLORS.gray700,
    marginTop: 20,
    marginBottom: 16,
  },
  heroContact: {
    gap: 4,
  },
  heroContactText: {
    fontSize: 12,
    fontFamily: F.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  heroContactLink: {
    fontSize: 12,
    fontFamily: F.mono,
    color: COLORS.accent,
    letterSpacing: 0.3,
    lineHeight: 18,
    opacity: 0.9,
  },

  // ── Build style tags ──
  styleRow: {
    flexDirection: "row",
    paddingHorizontal: SPACING.page,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.divider,
  },
  styleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.black,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  styleIcon: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  styleIconDot: {
    color: COLORS.accent,
    fontSize: 8,
  },
  styleLabel: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.white,
  },

  // ── Builds ──
  buildsSection: {
    marginTop: 8,
  },
  buildsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.page,
    paddingTop: 20,
    paddingBottom: 14,
  },
  buildsTitle: {
    fontSize: 11,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.textMuted,
  },
  buildsCount: {
    fontSize: 11,
    fontFamily: F.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  buildsScroll: {
    paddingHorizontal: SPACING.page,
    gap: 14,
  },
  emptyBuilds: {
    marginHorizontal: SPACING.page,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
  },
  emptyBuildsTitle: {
    fontSize: 22,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  emptyBuildsBody: {
    fontSize: 13,
    fontFamily: F.regular,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  buildCard: {
    width: CARD_W,
  },
  buildImgWrap: {
    width: CARD_W,
    height: CARD_W * 1.1,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  buildImg: S.cardImage,
  buildMeta: {
    fontSize: 9,
    fontFamily: F.mono,
    letterSpacing: 1,
    color: COLORS.textMuted,
    marginTop: 10,
  },
  buildModel: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
    marginTop: 2,
  },
  buildPrice: {
    fontSize: 12,
    fontFamily: F.monoMedium,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
    marginTop: 2,
  },

  // ── Pinned message button ──
  messageBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.page,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: COLORS.bg,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.divider,
  },
  messageBtn: S.primaryButton,
  messageBtnText: S.primaryButtonText,
});
