import { ListBikeSheet, type ListBikeSheetRef } from "@/components/ListBikeSheet";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatusState } from "@/components/StatusState";
import { ProfileRails } from "@/components/registry/ProfileRails";
import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { useAuth } from "@/context/AuthContext";
import { formatUsd } from "@/lib/formatters";
import { fetchGarageDetails } from "@/lib/garage-profile-db";
import {
  fetchBuilders,
  fetchMyListings,
  updateListingStatus,
  type RegistryListing,
  type RegistryShop,
} from "@/lib/registry-db";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ListingCard({
  listing,
  onPress,
  onTogglePending,
}: {
  listing: RegistryListing;
  onPress: () => void;
  onTogglePending?: () => void;
}) {
  const canTogglePending = listing.status === "active" || listing.status === "pending";
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
        <View style={styles.listingSide}>
          <View
            style={[
              styles.statusPill,
              listing.status === "pending" && styles.statusPillPending,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                listing.status === "pending" && styles.statusTextPending,
              ]}
            >
              {listing.status ?? "active"}
            </Text>
          </View>
          {canTogglePending ? (
            <Pressable
              style={styles.pendingButton}
              onPress={(event) => {
                event.stopPropagation();
                onTogglePending?.();
              }}
            >
              <Text style={styles.pendingButtonText}>
                {listing.status === "pending" ? "Back active" : "Mark pending"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

type ShopScreenRow =
  { kind: "listing"; id: string; listing: RegistryListing };

export default function ShopsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeView, member, memberStatus, setActiveView } = useAuth();
  const isBuilder = activeView === "builder";
  const listBikeSheetRef = useRef<ListBikeSheetRef>(null);

  const { data, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["shops-tab", activeView],
    queryFn: async () => {
      if (isBuilder) {
        return {
          listings: await fetchMyListings(),
          profiles: [] as RegistryShop[],
          garageDetails: await fetchGarageDetails().catch(() => null),
        };
      }
      const [profiles, listings, garageDetails] = await Promise.all([
        fetchBuilders(),
        fetchMyListings().catch(() => [] as RegistryListing[]),
        fetchGarageDetails().catch(() => null),
      ]);
      return { listings, profiles, garageDetails };
    },
  });

  const listings = data?.listings ?? [];
  const profiles = data?.profiles ?? [];
  const hasSellerAccount = Boolean(
    memberStatus === "approved" ||
      member?.type === "builder" ||
      listings.length > 0 ||
      data?.garageDetails?.garageName?.trim(),
  );
  const openListBikeSheet = useCallback(() => {
    listBikeSheetRef.current?.open();
  }, []);
  const openSellerDashboard = useCallback(() => {
    setActiveView("builder");
    router.replace("/(tabs)");
  }, [router, setActiveView]);
  const toggleListingPending = useCallback(
    async (listing: RegistryListing) => {
      const nextStatus = listing.status === "pending" ? "active" : "pending";
      try {
        await updateListingStatus(listing.id, nextStatus);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["shops-tab"] }),
          queryClient.invalidateQueries({ queryKey: ["home"] }),
          queryClient.invalidateQueries({ queryKey: ["search-listings"] }),
          queryClient.invalidateQueries({ queryKey: ["listing", listing.id] }),
          queryClient.invalidateQueries({ queryKey: ["profile-stats"] }),
        ]);
      } catch (error) {
        Alert.alert(
          "Could not update listing",
          error instanceof Error ? error.message : "Try again in a moment.",
        );
      }
    },
    [queryClient],
  );
  const rows: ShopScreenRow[] = isBuilder
    ? listings.map((listing) => ({
        kind: "listing" as const,
        id: listing.id,
        listing,
      }))
    : [];

  if (!isBuilder) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenHeader
          title="BUILDERS"
          right={
            <Pressable
              style={({ pressed }) => [
                styles.headerAction,
                pressed && styles.headerActionPressed,
              ]}
              onPress={openListBikeSheet}
              accessibilityRole="button"
              accessibilityLabel="Sell a bike"
            >
              <Text style={styles.headerActionText}>SELL</Text>
            </Pressable>
          }
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.profileContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.accent}
            />
          }
        >
          {isPending ? (
            <View style={styles.profileState}>
              <StatusState
                eyebrow="Loading"
                title="Opening builders"
                body="Builder profiles are loading."
              />
            </View>
          ) : profiles.length > 0 ? (
            <ProfileRails
              profiles={profiles}
              onOpenProfile={(profile) => {
                router.push(profile.kind === "profile" ? `/builder/${profile.slug}` : `/shop/${profile.slug}`);
              }}
              onOpenRail={(query) => {
                router.push({
                  pathname: "/(tabs)/search",
                  params: { q: query },
                });
              }}
            />
          ) : (
            <View style={styles.profileState}>
              <StatusState
                eyebrow="Builders"
                title="No builders yet"
                body="Builders will appear here after sellers list bikes. Start by listing yours."
                actionLabel="SELL A BIKE"
                onAction={openListBikeSheet}
              />
            </View>
          )}
        </ScrollView>
        <ListBikeSheet
          ref={listBikeSheetRef}
          showDashboardOption={hasSellerAccount}
          onOpenDashboard={openSellerDashboard}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title="LISTINGS"
        right={
          <Pressable
            style={({ pressed }) => [
              styles.headerAction,
              pressed && styles.headerActionPressed,
            ]}
            onPress={openListBikeSheet}
            accessibilityRole="button"
            accessibilityLabel="List a bike"
          >
            <Text style={styles.headerActionText}>LIST</Text>
          </Pressable>
        }
      />

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
            </View>
          </>
        }
        ListEmptyComponent={
          isPending ? null : <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyBody}>
              Create a listing when a bike is ready for buyers to see.
            </Text>
            <Pressable style={styles.emptyButton} onPress={openListBikeSheet}>
              <Text style={styles.emptyButtonText}>LIST YOUR FIRST BIKE</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={item.listing}
            onPress={() => router.push(`/listing/${item.id}`)}
            onTogglePending={() => toggleListingPending(item.listing)}
          />
        )}
      />
      <ListBikeSheet
        ref={listBikeSheetRef}
        showDashboardOption
        onOpenDashboard={openSellerDashboard}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  list: {
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  profileContent: {
    paddingBottom: SPACING.xxl,
  },
  profileState: {
    minHeight: 360,
  },
  headerAction: {
    minWidth: 84,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
  },
  headerActionPressed: {
    backgroundColor: COLORS.gray100,
  },
  headerActionText: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: F.monoBold,
    letterSpacing: 1.4,
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
  listingSide: {
    alignItems: "flex-end",
    gap: 8,
    maxWidth: 118,
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
  statusPillPending: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surfaceRaised,
  },
  statusText: {
    fontSize: 12,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  statusTextPending: {
    color: COLORS.accent,
  },
  pendingButton: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  pendingButtonText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.white,
    textAlign: "center",
  },
});
