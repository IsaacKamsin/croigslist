import { StatusState } from "@/components/StatusState";
import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { formatUsd } from "@/lib/formatters";
import { startConversation } from "@/lib/messages-db";
import { backOrReplace } from "@/lib/navigation";
import { fetchBuilderProfile, type RegistryListing } from "@/lib/registry-db";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const GRID_GAP = 14;
const CARD_WIDTH = (width - SPACING.page * 2 - GRID_GAP) / 2;

type SellerProfile = {
  id: string;
  name: string;
  image?: string;
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
  const { data: builder, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["builder-profile", id],
    queryFn: () => fetchBuilderProfile(id) as Promise<SellerProfile | null>,
    enabled: Boolean(id),
  });

  if (isPending) {
    return (
      <View style={styles.container}>
        <StatusState eyebrow="Loading" title="Opening seller profile" />
      </View>
    );
  }

  if (!builder) {
    return (
      <View style={styles.container}>
        <StatusState
          eyebrow="Not found"
          title="Seller profile unavailable"
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
  const activeListings = builder.listings.filter((item) => item.status === "active");
  const pendingListings = builder.listings.filter((item) => item.status === "pending");
  const visibleListings = [...activeListings, ...pendingListings];
  const soldListings = builder.listings.filter((item) => item.status === "sold");

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={COLORS.black}
        />
      }
    >
      <View style={styles.profileBlock}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            {builder.image ? (
              <Image
                source={{ uri: builder.image }}
                style={styles.avatarImage}
                contentFit="cover"
                cachePolicy={IMAGE_CACHE}
              />
            ) : (
              <Text style={styles.avatarText}>{builder.name[0]}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{builder.name}</Text>
            {builder.verified ? (
              <Text style={styles.verifiedLine}>Verified seller</Text>
            ) : null}
            {builder.memberSince ? (
              <Text style={styles.memberLine}>Member since: {builder.memberSince}</Text>
            ) : null}
            <Text style={styles.activityLine}>
              {activeListings.length} active · {pendingListings.length} pending · {soldListings.length} sold
            </Text>
          </View>
        </View>

        <View style={styles.statsActionRow}>
          <Pressable style={styles.contactButton} onPress={handleMessage}>
            <Text style={styles.contactButtonText}>Message seller</Text>
          </Pressable>
        </View>

        <Text style={styles.shopTitle}>Seller profile</Text>
        {builder.bio ? (
          <Text style={styles.bio} numberOfLines={3}>{builder.bio}</Text>
        ) : (
          <Text style={styles.bio} numberOfLines={3}>
            Bikes and builds from {builder.city || "this seller"}. Message for details, trades, or bundles.
          </Text>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Listings</Text>
      </View>

      <View style={styles.grid}>
        {visibleListings.length === 0 ? (
          <View style={styles.emptyListings}>
            <Text style={styles.emptyListingsTitle}>No listings yet</Text>
            <Text style={styles.emptyListingsBody}>
              Message the seller or check back after they publish.
            </Text>
            <Pressable style={styles.emptyListingsButton} onPress={handleMessage}>
              <Text style={styles.emptyListingsButtonText}>Message seller</Text>
            </Pressable>
          </View>
        ) : (
          visibleListings.map((item) => (
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
          <Text style={styles.soldTitle}>Sold listings</Text>
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
  const details = [item.mileage, item.city].filter(Boolean).join(" · ");

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardImageWrap}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE}
          />
        ) : (
          <View style={styles.cardImageFallback}>
            <Text style={styles.cardImageFallbackText}>NO PHOTO</Text>
          </View>
        )}
        {sold ? (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldOverlayText}>SOLD</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {item.year} · {item.make}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.model}</Text>
        <View style={styles.cardBottomRow}>
          <Text style={styles.cardPrice}>{formatUsd(item.price)}</Text>
          {details ? (
            <Text style={styles.cardDetail} numberOfLines={1}>{details}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,

  profileBlock: {
    paddingHorizontal: SPACING.page,
    paddingTop: 24,
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
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
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
  verifiedLine: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: F.semibold,
    color: COLORS.textSecondary,
    marginTop: 7,
  },
  memberLine: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 7,
  },
  activityLine: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  statsActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
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
  contactButton: {
    flex: 1,
    minWidth: 180,
    minHeight: 44,
    paddingHorizontal: 18,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  contactButtonText: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.white,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.page,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: F.bold,
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
    marginBottom: 18,
  },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageFallbackText: {
    fontSize: 11,
    fontFamily: F.bold,
    color: COLORS.textMuted,
  },
  cardInfo: {
    paddingTop: 8,
  },
  cardMeta: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: F.semibold,
    color: COLORS.textSecondary,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  cardBottomRow: {
    marginTop: 5,
  },
  cardPrice: {
    fontSize: 14,
    lineHeight: 17,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  cardDetail: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 2,
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
  emptyListingsButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.black,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: SPACING.md,
  },
  emptyListingsButtonText: {
    fontSize: 14,
    fontFamily: F.bold,
    color: COLORS.white,
  },
});
