import { ScreenHeader } from "@/components/ScreenHeader";
import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { useAuth } from "@/context/AuthContext";
import { formatUsd } from "@/lib/formatters";
import {
  fetchMyListings,
  fetchBuilders,
  type RegistryListing,
  type RegistryShop,
} from "@/lib/registry-db";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { HeartIcon, MagnifyingGlassIcon } from "phosphor-react-native";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

type BuilderRailConfig = {
  key: string;
  title: string;
  items: RegistryShop[];
  emptyTitle: string;
  emptyBody: string;
};

function shopSearchText(shop: RegistryShop) {
  return [
    shop.name,
    shop.specialty,
    shop.tagline,
    shop.location,
    shop.address,
    ...(shop.badges ?? []),
    ...(shop.buildStyles ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function shopMatches(shop: RegistryShop, terms: string[]) {
  const searchText = shopSearchText(shop);
  return terms.some((term) => searchText.includes(term));
}

function buildBuilderRails(shops: RegistryShop[]): BuilderRailConfig[] {
  const verifiedShops = shops.filter((shop) => shop.verified);
  const inventory = shops.filter((shop) => shop.builds > 0);
  const newSellers = shops.slice(0, 8);
  const minneapolis = shops.filter((shop) => shopMatches(shop, ["minneapolis"]));
  const japanese = shops.filter((shop) =>
    shopMatches(shop, ["japanese", "honda", "yamaha", "suzuki", "kawasaki"]),
  );
  const custom = shops.filter((shop) => shopMatches(shop, ["custom", "fabrication", "build"]));
  const restoration = shops.filter((shop) =>
    shopMatches(shop, ["restoration", "restore", "restored", "vintage"]),
  );
  const messageReady = shops.filter((shop) => shop.email || shop.phone || shop.website);

  return [
    {
      key: "verified",
      title: "Verified shops",
      items: verifiedShops,
      emptyTitle: "No verified shops yet",
      emptyBody: "Approved shops will show up once their profiles are complete.",
    },
    {
      key: "inventory",
      title: "Shops with inventory",
      items: inventory,
      emptyTitle: "No bikes listed yet",
      emptyBody: "Live shop inventory will fill this rail as listings go up.",
    },
    {
      key: "new",
      title: "New shops",
      items: newSellers,
      emptyTitle: "No shops yet",
      emptyBody: "Recently joined shops will appear here.",
    },
    {
      key: "minneapolis",
      title: "Minneapolis shops",
      items: minneapolis,
      emptyTitle: "No Minneapolis shops yet",
      emptyBody: "Local shops will appear here when their garage location is set.",
    },
    {
      key: "japanese",
      title: "Japanese classics",
      items: japanese,
      emptyTitle: "No Japanese classic specialists yet",
      emptyBody: "Honda, Yamaha, Suzuki, and Kawasaki sellers will appear here.",
    },
    {
      key: "custom",
      title: "Custom builds",
      items: custom,
      emptyTitle: "No custom builders yet",
      emptyBody: "Fabricators and one-off builders will appear here.",
    },
    {
      key: "restoration",
      title: "Restoration specialists",
      items: restoration,
      emptyTitle: "No restoration specialists yet",
      emptyBody: "Vintage and restoration-focused garages will appear here.",
    },
    {
      key: "message-ready",
      title: "Contact-ready shops",
      items: messageReady,
      emptyTitle: "No contact-ready shops yet",
      emptyBody: "Shops with phone, email, or website details will appear here.",
    },
  ];
}

function BuilderCard({
  shop,
  onPress,
  isFavorite,
  onToggleFavorite,
}: {
  shop: RegistryShop;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const contactCount = [shop.email, shop.phone, shop.website].filter(Boolean).length;
  const location = shop.location ?? shop.address ?? "Location not set";

  return (
    <Pressable style={styles.builderCard} onPress={onPress}>
      <View style={styles.builderImageWrap}>
        {shop.image ? (
          <Image
            source={{ uri: shop.image }}
            style={styles.builderImage}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE}
            recyclingKey={shop.image}
          />
        ) : (
          <View style={styles.profileImageFallback}>
            <Text style={styles.profileImageInitial}>
              {shop.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        {shop.verified ? (
          <View style={styles.favoriteBadge}>
            <Text style={styles.favoriteBadgeText}>Verified</Text>
          </View>
        ) : null}
        <Pressable
          style={styles.favoriteButton}
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          hitSlop={8}
        >
          <HeartIcon
            color={COLORS.white}
            size={24}
            weight={isFavorite ? "fill" : "bold"}
          />
        </Pressable>
      </View>
      <Text style={styles.builderName} numberOfLines={2}>{shop.name}</Text>
      <Text style={styles.builderMeta} numberOfLines={1}>
        {shop.specialty}
      </Text>
      <Text style={styles.builderSub} numberOfLines={1}>
        {location}
      </Text>
      <Text style={styles.builderSignal}>
        {shop.builds} listings · {contactCount > 0 ? "contact ready" : "message only"}
      </Text>
    </Pressable>
  );
}

function ListingCard({
  listing,
  onPress,
}: {
  listing: RegistryListing;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.listingCard} onPress={onPress}>
      {listing.image ? (
        <Image
          source={{ uri: listing.image }}
          style={styles.listingImage}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
          recyclingKey={listing.image}
        />
      ) : (
        <View style={styles.listingImageFallback}>
          <Text style={styles.listingImageFallbackText}>NO PHOTO</Text>
        </View>
      )}
      <View style={styles.listingInfo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listingMeta}>{listing.year} · {listing.make}</Text>
          <Text style={styles.listingName}>{listing.model}</Text>
          <Text style={styles.listingPrice}>{formatUsd(listing.price)}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{listing.status ?? "active"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

type ShopScreenRow =
  | { kind: "listing"; id: string; listing: RegistryListing }
  | { kind: "shop"; id: string; shop: RegistryShop };

export default function ShopsScreen() {
  const router = useRouter();
  const { activeView } = useAuth();
  const [favoriteShopIds, setFavoriteShopIds] = useState<Set<string>>(() => new Set());
  const isBuilder = activeView === "builder";
  const { data, isRefetching, refetch } = useQuery({
    queryKey: ["shops-tab", activeView],
    queryFn: async () => {
      if (isBuilder) {
        return { listings: await fetchMyListings(), shops: [] as RegistryShop[] };
      }
      return { listings: [] as RegistryListing[], shops: await fetchBuilders() };
    },
    initialData: { listings: [] as RegistryListing[], shops: [] as RegistryShop[] },
  });

  const listings = data.listings;
  const shops = data.shops;
  const shopProfiles = useMemo(
    () => shops.filter((shop) => shop.kind !== "profile"),
    [shops],
  );
  const builderRails = useMemo(() => buildBuilderRails(shopProfiles), [shopProfiles]);
  const favoriteShops = useMemo(
    () => shopProfiles.filter((shop) => favoriteShopIds.has(shop.id)),
    [favoriteShopIds, shopProfiles],
  );
  const toggleFavoriteShop = useCallback((id: string) => {
    setFavoriteShopIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  const rows: ShopScreenRow[] = isBuilder
    ? listings.map((listing) => ({
        kind: "listing" as const,
        id: listing.id,
        listing,
      }))
    : shopProfiles.map((shop) => ({ kind: "shop" as const, id: shop.id, shop }));

  if (!isBuilder) {
    const openShop = (shop: RegistryShop) => {
      router.push(`/shop/${shop.slug}`);
    };

    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.marketContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.accent}
            />
          }
        >
          <Pressable
            style={styles.searchPill}
            onPress={() => router.push("/(tabs)/search")}
          >
            <MagnifyingGlassIcon size={16} color={COLORS.textPrimary} weight="bold" />
            <Text style={styles.searchPillText}>Search builders or bikes</Text>
          </Pressable>

          {favoriteShops.length > 0 ? (
            <BuilderSection
              title="Fave shops"
              items={favoriteShops}
              emptyTitle="No favorites yet"
              emptyBody="Tap the heart on a shop to save it here."
              favoriteShopIds={favoriteShopIds}
              onToggleFavorite={toggleFavoriteShop}
              onPress={openShop}
            />
          ) : null}

          {builderRails.map((rail) => (
            <BuilderSection
              key={rail.key}
              title={rail.title}
              items={rail.items}
              emptyTitle={rail.emptyTitle}
              emptyBody={rail.emptyBody}
              favoriteShopIds={favoriteShopIds}
              onToggleFavorite={toggleFavoriteShop}
              onPress={openShop}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="LISTINGS" />

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.accent}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.builderTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subtitleStrong}>Your listings</Text>
                <Text style={styles.subtitle}>
                  Active, sold, and draft bikes tied to your seller account.
                </Text>
              </View>
              <Pressable style={styles.addButton} onPress={() => router.push("/listing/create")}>
                <Text style={styles.addButtonText}>+ LIST</Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyBody}>
              Create a listing when a bike is ready for buyers to see.
            </Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push("/listing/create")}>
              <Text style={styles.emptyButtonText}>LIST YOUR FIRST BIKE</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === "listing" ? (
            <ListingCard
              listing={item.listing}
              onPress={() => router.push(`/listing/${item.id}`)}
            />
          ) : (
            null
          )
        }
      />
    </SafeAreaView>
  );
}

function BuilderSection({
  title,
  items,
  emptyTitle,
  emptyBody,
  favoriteShopIds,
  onToggleFavorite,
  onPress,
}: {
  title: string;
  items: RegistryShop[];
  emptyTitle: string;
  emptyBody: string;
  favoriteShopIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onPress: (shop: RegistryShop) => void;
}) {
  return (
    <View style={styles.builderSection}>
      <Text style={styles.builderSectionTitle}>{title} ›</Text>
      {items.length > 0 ? (
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.builderRail}
          renderItem={({ item }) => (
            <BuilderCard
              shop={item}
              isFavorite={favoriteShopIds.has(item.id)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
              onPress={() => onPress(item)}
            />
          )}
        />
      ) : (
        <View style={styles.railEmpty}>
          <Text style={styles.railEmptyTitle}>{emptyTitle}</Text>
          <Text style={styles.railEmptyBody}>{emptyBody}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  header: S.screenHeader,
  title: S.screenTitle,
  divider: S.divider,
  list: {
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  marketContent: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  searchPill: {
    marginHorizontal: SPACING.page,
    minHeight: 58,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 29,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  searchPillText: {
    fontSize: 17,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  subtitleStrong: {
    fontSize: 22,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
  },
  builderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  addButton: {
    backgroundColor: COLORS.black,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.white,
  },
  empty: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  emptyButton: {
    backgroundColor: COLORS.black,
    alignItems: "center",
    borderRadius: 28,
    paddingVertical: 16,
    marginTop: SPACING.lg,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.white,
  },

  profileImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  profileImageInitial: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.black,
  },
  builderSection: {
    paddingTop: SPACING.xl,
  },
  builderSectionTitle: {
    fontSize: 20,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.page,
    marginBottom: SPACING.md,
  },
  builderRail: {
    paddingHorizontal: SPACING.page,
    gap: SPACING.md,
  },
  railEmpty: {
    marginHorizontal: SPACING.page,
    minHeight: 118,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  railEmptyTitle: {
    fontSize: 18,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  railEmptyBody: {
    fontSize: 13,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  builderCard: {
    width: 156,
    marginRight: SPACING.md,
  },
  builderImageWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    overflow: "hidden",
  },
  builderImage: {
    width: "100%",
    height: "100%",
  },
  favoriteBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: COLORS.black,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  favoriteBadgeText: {
    fontSize: 12,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  favoriteButton: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.overlay35,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.whiteA50,
  },
  builderName: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    lineHeight: 18,
    marginTop: SPACING.sm,
  },
  builderMeta: {
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  builderSub: {
    fontSize: 13,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  builderSignal: {
    fontSize: 12,
    fontFamily: F.semibold,
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    marginTop: 5,
  },
  listingCard: {
    borderWidth: 0,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.bg,
  },
  listingImage: {
    width: "100%",
    height: 190,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  listingImageFallback: {
    width: "100%",
    height: 190,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  listingImageFallbackText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.4,
    color: COLORS.textFaint,
  },
  listingInfo: {
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.md,
  },
  listingMeta: {
    fontSize: 14,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  listingName: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  listingPrice: {
    fontSize: 20,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  statusPill: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
});
