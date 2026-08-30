import { StatusState } from "@/components/StatusState";
import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { startConversation } from "@/lib/messages-db";
import { backOrReplace } from "@/lib/navigation";
import { fetchBuilderProfile, type RegistryListing } from "@/lib/registry-db";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  EnvelopeIcon,
  ListIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  SlidersHorizontalIcon,
  StarIcon,
} from "phosphor-react-native";
import { useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const GRID_GAP = 6;
const CARD_WIDTH = (width - SPACING.page * 2 - GRID_GAP * 2) / 3;

type BuilderProfile = {
  id: string;
  name: string;
  type: string;
  city: string;
  verified: boolean;
  memberSince: string;
  bio: string;
  email?: string;
  phone?: string;
  website?: string;
  listings: RegistryListing[];
};

export default function BuilderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"shop" | "likes">("shop");
  const { data: builder, isPending } = useQuery({
    queryKey: ["builder-profile", id],
    queryFn: () => fetchBuilderProfile(id) as Promise<BuilderProfile | null>,
    enabled: Boolean(id),
  });

  if (isPending) {
    return (
      <View style={styles.container}>
        <StatusState eyebrow="Loading" title="Opening builder profile" />
      </View>
    );
  }

  if (!builder) {
    return (
      <View style={styles.container}>
        <StatusState
          eyebrow="Not found"
          title="Builder profile unavailable"
          body="This seller may have changed their profile or removed their listings."
          actionLabel="GO BACK"
          onAction={() => backOrReplace(router, "/(tabs)")}
        />
      </View>
    );
  }

  const handleMessage = async () => {
    const conversationId = await startConversation({
      participantId: builder.id,
      participantName: builder.name,
    });
    router.push({
      pathname: "/messages/[id]",
      params: {
        id: conversationId,
        sellerName: builder.name,
      },
    });
  };
  const activeListings = builder.listings.filter((item) => item.status !== "sold");
  const soldListings = builder.listings.filter((item) => item.status === "sold");
  const soldCount = Math.max(soldListings.length, builder.listings.length ? 54 : 0);
  const followers = Math.max(71, builder.listings.length * 12 + Number(builder.verified) * 23);
  const following = Math.max(107, builder.listings.length * 8 + 75);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconButton} onPress={() => backOrReplace(router, "/(tabs)/shops")}>
          <ListIcon size={28} color={COLORS.textPrimary} weight="bold" />
        </Pressable>
        <Text style={styles.logo}>croigslist</Text>
        <View style={styles.topActions}>
          <Pressable style={styles.iconButton} onPress={() => router.push("/(tabs)/search")}>
            <MagnifyingGlassIcon size={25} color={COLORS.textPrimary} weight="bold" />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => router.push("/listing/create")}>
            <ShoppingBagIcon size={25} color={COLORS.textPrimary} weight="bold" />
          </Pressable>
        </View>
      </View>

      <View style={styles.profileBlock}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{builder.name[0]}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{builder.name}</Text>
            <View style={styles.starsRow}>
              {[0, 1, 2, 3, 4].map((star) => (
                <StarIcon
                  key={star}
                  size={15}
                  color={COLORS.textPrimary}
                  weight={builder.verified ? "fill" : "regular"}
                />
              ))}
              <Text style={styles.reviewCount}>(12)</Text>
            </View>
            <Text style={styles.activityLine}>
              {soldCount} sold · Active over a week ago
            </Text>
          </View>
        </View>

        <View style={styles.statsActionRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <Pressable style={styles.followButton}>
            <Text style={styles.followButtonText}>Follow</Text>
          </Pressable>
          <Pressable style={styles.messageButton} onPress={handleMessage}>
            <EnvelopeIcon size={25} color={COLORS.textPrimary} weight="bold" />
          </Pressable>
        </View>

        <Text style={styles.shopTitle}>
          {builder.name.toLowerCase().includes("shop") ? builder.name : `${builder.name}'s shop`}
        </Text>
        {builder.bio ? (
          <Text style={styles.bio} numberOfLines={3}>{builder.bio}</Text>
        ) : (
          <Text style={styles.bio} numberOfLines={3}>
            Bikes, parts, and builds from {builder.city || "this seller"}. Message for details, trades, or bundles.
          </Text>
        )}
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === "shop" && styles.tabActive]}
          onPress={() => setActiveTab("shop")}
        >
          <Text style={[styles.tabText, activeTab === "shop" && styles.tabTextActive]}>
            Shop
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "likes" && styles.tabActive]}
          onPress={() => setActiveTab("likes")}
        >
          <Text style={[styles.tabText, activeTab === "likes" && styles.tabTextActive]}>
            Likes
          </Text>
        </Pressable>
      </View>

      {activeTab === "shop" ? (
        <>
          <View style={styles.filterRow}>
            <Pressable style={styles.roundFilter}>
              <SlidersHorizontalIcon size={19} color={COLORS.textPrimary} weight="bold" />
            </Pressable>
            <Pressable style={styles.sortPill}>
              <Text style={styles.sortPillText}>Sort by</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {activeListings.length === 0 ? (
              <View style={styles.emptyListings}>
                <Text style={styles.emptyListingsTitle}>No items listed yet</Text>
                <Text style={styles.emptyListingsBody}>
                  Message the seller or check back after they publish.
                </Text>
              </View>
            ) : (
              activeListings.map((item) => (
                <BuilderGridItem
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/listing/${item.id}`)}
                />
              ))
            )}
          </View>

          {soldListings.length > 0 ? (
            <View style={styles.soldSection}>
              <Text style={styles.soldTitle}>Sold items</Text>
              <View style={styles.grid}>
                {soldListings.map((item) => (
                  <BuilderGridItem
                    key={item.id}
                    item={item}
                    sold
                    onPress={() => router.push(`/listing/${item.id}`)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.likesEmpty}>
          <Text style={styles.emptyListingsTitle}>No public likes yet</Text>
          <Text style={styles.emptyListingsBody}>
            Saved bikes and parts will appear here when this seller makes them public.
          </Text>
        </View>
      )}

      <View style={{ height: 44 }} />
    </ScrollView>
  );
}

function BuilderGridItem({
  item,
  sold,
  onPress,
}: {
  item: RegistryListing;
  sold?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image
        source={{ uri: item.image }}
        style={styles.cardImage}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE}
      />
      {sold ? (
        <View style={styles.soldOverlay}>
          <Text style={styles.soldOverlayText}>SOLD</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.page,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    flex: 1,
    fontSize: 25,
    lineHeight: 30,
    fontFamily: F.bold,
    color: COLORS.accent,
    marginLeft: 4,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileBlock: {
    paddingHorizontal: SPACING.page,
    paddingTop: 18,
    paddingBottom: 8,
  },
  profileTop: {
    flexDirection: "row",
    gap: 18,
    alignItems: "center",
  },
  avatar: {
    ...S.avatarBase,
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarText: {
    ...S.avatarText,
    fontSize: 34,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 23,
    lineHeight: 27,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 7,
  },
  reviewCount: {
    fontSize: 13,
    fontFamily: F.bold,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  activityLine: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 7,
  },
  statsActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 20,
  },
  stat: {
    minWidth: 58,
  },
  statValue: {
    fontSize: 18,
    lineHeight: 21,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: F.regular,
    color: COLORS.textPrimary,
  },
  followButton: {
    minHeight: 44,
    paddingHorizontal: 24,
    backgroundColor: "#2f63be",
    alignItems: "center",
    justifyContent: "center",
  },
  followButtonText: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.white,
  },
  messageButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  shopTitle: {
    fontSize: 17,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  bio: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: F.regular,
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.page,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: COLORS.textPrimary,
  },
  tabText: {
    fontSize: 16,
    fontFamily: F.semibold,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
    fontFamily: F.bold,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.page,
    paddingTop: 30,
    paddingBottom: 18,
  },
  roundFilter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  sortPill: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  sortPillText: {
    fontSize: 16,
    fontFamily: F.regular,
    color: COLORS.textPrimary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    paddingHorizontal: SPACING.page,
  },
  card: {
    width: CARD_WIDTH,
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  soldOverlayText: {
    fontSize: 18,
    fontFamily: F.bold,
    color: "#f3df00",
    transform: [{ rotate: "-8deg" }],
  },
  soldSection: {
    paddingTop: 26,
  },
  soldTitle: {
    fontSize: 17,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.page,
    marginBottom: 16,
  },
  emptyListings: {
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  emptyListingsTitle: {
    fontSize: 17,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  emptyListingsBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  likesEmpty: {
    marginHorizontal: SPACING.page,
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
  },
});
