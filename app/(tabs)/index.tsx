import {
  ListingGridSection,
  ShopsSection,
  SoldSection,
} from "@/components/registry/sections";
import { COLORS, F, SPACING } from "@/constants/design";
import { hapticLight } from "@/hooks/useHaptics";
import { useAuth } from "@/context/AuthContext";
import {
  fetchMyListings,
  fetchRegistryData,
  type RegistryData,
  type RegistryListing,
} from "@/lib/registry-db";
import { fetchGarageDetails, type GarageDetails } from "@/lib/garage-profile-db";
import { formatUsd } from "@/lib/formatters";
import { shareSellerInvite } from "@/lib/share";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlassIcon } from "phosphor-react-native";
import React, { useCallback } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

export default function RegistryScreen() {
  const router = useRouter();
  const { activeView, member } = useAuth();
  const isBuilder = activeView === "builder";
  const { data, isRefetching, refetch } = useQuery({
    queryKey: ["home", activeView],
    queryFn: async () => {
      if (activeView === "builder") {
        return {
          registryData: null,
          myListings: await fetchMyListings(),
          garageDetails: await fetchGarageDetails().catch(() => null),
        };
      }

      return {
        registryData: await fetchRegistryData(),
        myListings: [] as RegistryListing[],
        garageDetails: null as GarageDetails | null,
      };
    },
    initialData: {
      registryData: null as RegistryData | null,
      myListings: [] as RegistryListing[],
      garageDetails: null as GarageDetails | null,
    },
  });
  const registryData = data.registryData;
  const myListings = data.myListings;
  const garageDetails = data.garageDetails;
  const bikesForSale = registryData?.bikesForSale ?? registryData?.justListed ?? [];
  const partsForSale = registryData?.partsForSale ?? [];
  const shops = registryData?.shops ?? [];

  const goListing = useCallback(
    (id: string) => router.push(`/listing/${id}`),
    [router],
  );
  const goShop = useCallback(
    (slug: string) => router.push(`/shop/${slug}`),
    [router],
  );
  const goCategory = useCallback(
    (key: "just-listed" | "under-5k" | "project-bikes") => {
      hapticLight();
      router.push(`/listing/category/${key}`);
    },
    [router],
  );
  const goJustListed = useCallback(() => goCategory("just-listed"), [goCategory]);
  const goUnder5k = useCallback(() => goCategory("under-5k"), [goCategory]);
  const goProjectBikes = useCallback(() => goCategory("project-bikes"), [goCategory]);
  const goAllShops = useCallback(() => {
    hapticLight();
    router.push("/(tabs)/shops");
  }, [router]);
  const goSearch = useCallback(() => {
    hapticLight();
    router.push("/(tabs)/search");
  }, [router]);
  const hasBuyerInventory = Boolean(
    registryData &&
      (registryData.featured ||
        bikesForSale.length > 0 ||
        partsForSale.length > 0 ||
        registryData.justListed.length > 0 ||
        registryData.under5k.length > 0 ||
        registryData.rareFinds.length > 0 ||
        registryData.projectBikes.length > 0 ||
        shops.length > 0 ||
        registryData.sold.length > 0),
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {isBuilder ? (
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.userName}>{member?.handle ?? "Seller"}</Text>
            <Text style={s.roleLine}>Seller home</Text>
          </View>
          <Pressable
            style={s.listBtn}
            onPress={() => router.push("/listing/create")}
          >
            <Text style={s.listBtnText}>LIST A BIKE</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.buyerHeader}>
          <Pressable style={s.searchPill} onPress={goSearch}>
            <MagnifyingGlassIcon size={18} color={COLORS.textPrimary} weight="bold" />
            <Text style={s.searchPillText}>Search bikes, parts, or builders</Text>
          </Pressable>
        </View>
      )}

      <View style={s.catDivider} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.accent}
          />
        }
      >
        {isBuilder ? (
          <BuilderDashboard
            listings={myListings}
            garageDetails={garageDetails}
            onCreate={() => router.push("/listing/create")}
            onGarageDetails={() => router.push("/garage/details")}
            onOpenListing={goListing}
          />
        ) : (
          <>
            {!hasBuyerInventory && (
              <BuyerEmptyState
                onBuilders={() => router.push("/(tabs)/shops")}
                onSearch={goSearch}
                onInvite={shareSellerInvite}
              />
            )}
            {registryData && (
              <>
                {bikesForSale.length > 0 && (
                  <ListingGridSection
                    title="Bikes"
                    sub="Fresh listings from builders and private sellers."
                    items={bikesForSale}
                    goListing={goListing}
                    onSeeAll={goJustListed}
                  />
                )}
                {registryData.justListed.length > 0 && (
                  <ListingGridSection
                    title="Just listed"
                    sub="New bikes from shops and private sellers."
                    items={registryData.justListed}
                    goListing={goListing}
                    onSeeAll={goJustListed}
                  />
                )}
                {registryData.under5k.length > 0 && (
                  <ListingGridSection
                    title="Under $5K"
                    sub="Good finds without collector pricing."
                    items={registryData.under5k}
                    goListing={goListing}
                    onSeeAll={goUnder5k}
                  />
                )}
                {registryData.rareFinds.length > 0 && (
                  <ListingGridSection
                    title="Rare finds"
                    sub="Harder-to-find bikes worth a closer look."
                    items={registryData.rareFinds}
                    goListing={goListing}
                  />
                )}
                {registryData.projectBikes.length > 0 && (
                  <ListingGridSection
                    title="Project bikes"
                    sub="Incomplete, imperfect, and priced to move."
                    items={registryData.projectBikes}
                    goListing={goListing}
                    onSeeAll={goProjectBikes}
                  />
                )}
                {partsForSale.length > 0 && (
                  <ListingGridSection
                    title="Parts for sale"
                    sub="Engines, tanks, seats, wheels, and shop leftovers."
                    items={partsForSale}
                    goListing={goListing}
                    onSeeAll={goJustListed}
                  />
                )}
                {shops.length > 0 && (
                  <ShopsSection
                    shops={shops}
                    goShop={goShop}
                    onSeeAll={goAllShops}
                    title="Shops you might like"
                    sub="Follow builders and sellers with inventory you care about."
                  />
                )}
                {registryData.sold.length > 0 && (
                  <SoldSection items={registryData.sold} />
                )}
              </>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

function BuyerEmptyState({
  onBuilders,
  onSearch,
  onInvite,
}: {
  onBuilders: () => void;
  onSearch: () => void;
  onInvite: () => void;
}) {
  return (
    <View style={s.buyerEmpty}>
      <Text style={s.buyerEmptyEyebrow}>Marketplace</Text>
      <Text style={s.buyerEmptyTitle}>No listings yet</Text>
      <Text style={s.buyerEmptyBody}>
        Live listings will appear here after sellers publish. For now, browse builders or search the registry.
      </Text>
      <View style={s.buyerEmptyActions}>
        <Pressable style={s.buyerPrimaryAction} onPress={onBuilders}>
          <Text style={s.buyerPrimaryActionText}>BUILDERS</Text>
        </Pressable>
        <Pressable style={s.buyerSecondaryAction} onPress={onSearch}>
          <Text style={s.buyerSecondaryActionText}>SEARCH</Text>
        </Pressable>
      </View>
      <Pressable style={s.inviteInline} onPress={onInvite}>
        <Text style={s.inviteInlineText}>INVITE A SELLER</Text>
      </Pressable>
    </View>
  );
}

function BuilderDashboard({
  listings,
  garageDetails,
  onCreate,
  onGarageDetails,
  onOpenListing,
}: {
  listings: RegistryListing[];
  garageDetails: GarageDetails | null;
  onCreate: () => void;
  onGarageDetails: () => void;
  onOpenListing: (id: string) => void;
}) {
  const activeCount = listings.filter((listing) => listing.status === "active").length;
  const soldListings = listings.filter((listing) => listing.status === "sold");
  const soldCount = soldListings.length;
  const draftCount = listings.filter((listing) => listing.status === "draft").length;
  const earnings = soldListings.reduce((total, listing) => total + listing.price, 0);
  const hasGarageDetails = Boolean(
    garageDetails?.garageName?.trim() &&
      (garageDetails?.contactEmail?.trim() ||
        garageDetails?.phone?.trim() ||
        garageDetails?.website?.trim()),
  );
  const setupComplete = Number(hasGarageDetails) + Number(listings.length > 0);

  return (
    <View style={s.builderWrap}>
      {setupComplete < 2 ? (
        <View style={s.setupPanel}>
          <View style={s.setupHeader}>
            <Text style={s.setupEyebrow}>Seller setup</Text>
            <Text style={s.setupCount}>{setupComplete}/2</Text>
          </View>
          <SetupStep
            done={hasGarageDetails}
            title="Add garage contact"
            body="Name, city, and contact info buyers can trust."
            onPress={onGarageDetails}
          />
          <SetupStep
            done={listings.length > 0}
            title="Publish first listing"
            body="Add photos, price, and details for your first bike."
            onPress={onCreate}
          />
        </View>
      ) : null}

      {setupComplete === 2 ? (
        <>
          <View style={s.earningsPanel}>
            <Text style={s.earningsLabel}>Earnings</Text>
            <Text style={s.earningsValue}>{formatUsd(earnings)}</Text>
            <Text style={s.earningsSub}>
              {soldCount > 0
                ? `${soldCount} sold`
                : "No sales yet"}
            </Text>
          </View>

          <View style={s.metricsRow}>
            <Metric label="Listings" value={listings.length} />
            <Metric label="Active" value={activeCount} />
            <Metric label="Sold" value={soldCount} />
            <Metric label="Drafts" value={draftCount} />
          </View>
        </>
      ) : null}

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>Listings</Text>
          <Text style={s.sectionSub}>
            {listings.length > 0
              ? `${activeCount} active`
              : "Empty"}
          </Text>
        </View>
      </View>

      {listings.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No listings yet</Text>
          <Text style={s.emptyBody}>
            Add photos, price, and location. Publish when it is ready for buyers.
          </Text>
          <Pressable style={s.emptyButton} onPress={onCreate}>
            <Text style={s.emptyButtonText}>LIST YOUR FIRST BIKE</Text>
          </Pressable>
        </View>
      ) : (
        listings.map((listing) => (
          <Pressable
            key={listing.id}
            style={s.inventoryCard}
            onPress={() => onOpenListing(listing.id)}
          >
            {listing.image ? (
              <Image source={{ uri: listing.image }} style={s.inventoryImage} contentFit="cover" />
            ) : (
              <View style={s.inventoryPlaceholder}>
                <Text style={s.inventoryPlaceholderText}>NO PHOTO</Text>
              </View>
            )}
            <View style={s.inventoryBody}>
              <View style={{ flex: 1 }}>
                <Text style={s.inventoryMeta}>{listing.year} · {listing.make}</Text>
                <Text style={s.inventoryName}>{listing.model}</Text>
                <Text style={s.inventoryPrice}>{formatUsd(listing.price)}</Text>
              </View>
              <View style={s.statusPill}>
                <Text style={s.statusText}>{listing.status ?? "active"}</Text>
              </View>
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

function SetupStep({
  done,
  title,
  body,
  onPress,
}: {
  done: boolean;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.setupStep} onPress={onPress}>
      <View style={[s.setupMark, done && s.setupMarkDone]}>
        <Text style={[s.setupMarkText, done && s.setupMarkTextDone]}>
          {done ? "✓" : ""}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.setupTitle}>{title}</Text>
        <Text style={s.setupBody}>{body}</Text>
      </View>
      <Text style={s.setupArrow}>→</Text>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

const P = SPACING.page;
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: P,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 12,
  },
  greeting: {
    fontSize: 11,
    fontFamily: F.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 22,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
    marginTop: -1,
  },
  roleLine: {
    fontSize: 10,
    fontFamily: F.monoMedium,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: 2,
    textTransform: "uppercase",
  },
  listBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listBtnText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.white,
  },
  buyerHeader: {
    paddingHorizontal: P,
    paddingTop: 8,
    paddingBottom: 14,
  },
  searchPill: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 26,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.white,
  },
  searchPillText: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
  },
  catDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: P,
  },
  buyerEmpty: {
    marginHorizontal: P,
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: 18,
    backgroundColor: COLORS.surface,
  },
  buyerEmptyEyebrow: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.6,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  buyerEmptyTitle: {
    fontSize: 30,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  buyerEmptyBody: {
    fontSize: 14,
    fontFamily: F.regular,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  buyerEmptyActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  buyerPrimaryAction: {
    flex: 1,
    backgroundColor: COLORS.black,
    paddingVertical: 13,
    alignItems: "center",
  },
  buyerPrimaryActionText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.3,
    color: COLORS.white,
  },
  buyerSecondaryAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.black,
    paddingVertical: 12,
    alignItems: "center",
  },
  buyerSecondaryActionText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.3,
    color: COLORS.textPrimary,
  },
  inviteInline: {
    alignSelf: "flex-start",
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textMuted,
    paddingBottom: 2,
  },
  inviteInlineText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.3,
    color: COLORS.textSecondary,
  },
  builderWrap: {
    paddingHorizontal: P,
    paddingTop: 18,
  },
  setupPanel: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    padding: 14,
    marginBottom: 18,
  },
  setupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  setupEyebrow: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  setupCount: {
    fontSize: 10,
    fontFamily: F.monoBold,
    color: COLORS.textPrimary,
  },
  setupStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  setupMark: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  setupMarkDone: {
    backgroundColor: COLORS.black,
    borderColor: COLORS.black,
  },
  setupMarkText: {
    fontSize: 12,
    fontFamily: F.bold,
    color: COLORS.textFaint,
  },
  setupMarkTextDone: {
    color: COLORS.white,
  },
  setupTitle: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  setupBody: {
    fontSize: 12,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  setupArrow: {
    fontSize: 16,
    color: COLORS.textFaint,
  },
  earningsPanel: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 18,
    marginBottom: 18,
  },
  earningsLabel: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  earningsValue: {
    fontSize: 42,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
    marginTop: 2,
  },
  earningsSub: {
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 18,
  },
  metric: {
    minWidth: 64,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: F.monoMedium,
    letterSpacing: 0.8,
    color: COLORS.textMuted,
    marginTop: 1,
    textTransform: "uppercase",
  },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 30,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  sectionSub: {
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: 20,
    backgroundColor: COLORS.surface,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  emptyBody: {
    fontSize: 15,
    fontFamily: F.regular,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  emptyButton: {
    backgroundColor: COLORS.black,
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 18,
  },
  emptyButtonText: {
    fontSize: 11,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.white,
  },
  inventoryCard: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: 14,
    backgroundColor: COLORS.bg,
  },
  inventoryImage: {
    width: "100%",
    aspectRatio: 1.55,
    backgroundColor: COLORS.surface,
  },
  inventoryPlaceholder: {
    width: "100%",
    aspectRatio: 1.55,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  inventoryPlaceholderText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textFaint,
  },
  inventoryBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  inventoryMeta: {
    fontSize: 10,
    fontFamily: F.monoMedium,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  inventoryName: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  inventoryPrice: {
    fontSize: 15,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  statusPill: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 1,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
});
