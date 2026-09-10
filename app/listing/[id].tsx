import { StatusState } from "@/components/StatusState";
import { COLORS, F, IMAGE_CACHE, SPACING, TYPE } from "@/constants/design";
import { hapticMedium, hapticSelection } from "@/hooks/useHaptics";
import { useAuth } from "@/context/AuthContext";
import { S } from "@/constants/styles";
import {
  createListingOffer,
  fetchListingTopOffer,
  fetchMyPendingOfferForListing,
} from "@/lib/offers-db";
import { fetchListingById } from "@/lib/registry-db";
import { formatUsd } from "@/lib/formatters";
import { sendConversationMessage, startConversation } from "@/lib/messages-db";
import { backOrReplace } from "@/lib/navigation";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretLeftIcon } from "phosphor-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const FOOTER_BUTTON_WIDTH = Math.min(190, Math.max(156, width * 0.42));

function formatOfferInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `$${Number(digits).toLocaleString("en-US")}`;
}

function amountFromOfferInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

// ── Photo Carousel ───────────────────────────────────────────────────
function PhotoCarousel({
  images,
  rare,
  topInset,
  onBack,
}: {
  images: string[];
  rare: boolean;
  topInset: number;
  onBack: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== activeIndex) {
      hapticSelection();
      setActiveIndex(index);
    }
  };

  return (
    <View>
      <Pressable
        style={[styles.photoBackButton, { top: topInset + 10 }]}
        onPress={onBack}
        hitSlop={12}
      >
        <CaretLeftIcon size={28} color={COLORS.white} weight="bold" />
      </Pressable>
      <FlatList
        ref={flatListRef}
        data={images}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={styles.carouselSlide}>
            {item ? (
              <Image
                source={{ uri: item }}
                style={styles.carouselImage}
                contentFit="cover"
                cachePolicy={IMAGE_CACHE}
              />
            ) : (
              <View style={styles.carouselImageFallback}>
                <Text style={styles.carouselImageFallbackText}>NO PHOTO</Text>
              </View>
            )}
          </View>
        )}
      />

      {rare && (
        <View style={[styles.rareBadge, { top: topInset + 62 }]}>
          <Text style={styles.rareBadgeText}>RARE</Text>
        </View>
      )}

      <View style={styles.dots}>
        {images.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {activeIndex + 1}/{images.length}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { activeView, member } = useAuth();
  const offerSheetRef = useRef<BottomSheetModal>(null);
  const offerSnapPoints = useMemo(() => ["58%"], []);
  const [selectedOffer, setSelectedOffer] = useState<"asking" | "near" | "low" | "custom">("custom");
  const [customOffer, setCustomOffer] = useState("");
  const { data: listing, isPending } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id),
    enabled: Boolean(id),
  });
  const { data: topOffer = null } = useQuery({
    queryKey: ["listing-top-offer", id],
    queryFn: () => fetchListingTopOffer(id),
    enabled: Boolean(id),
  });
  const { data: myPendingOffer = null } = useQuery({
    queryKey: ["my-pending-offer", id],
    queryFn: () => fetchMyPendingOfferForListing(id),
    enabled: Boolean(id),
  });
  const offerOptions = useMemo(() => {
    const asking = listing?.price ?? 0;
    if (!asking) return [];
    return [
      { key: "asking" as const, label: "Asking price", amount: asking },
      { key: "near" as const, label: "Strong offer", amount: Math.round(asking * 0.9) },
      { key: "low" as const, label: "Start offer", amount: Math.round(asking * 0.8) },
    ];
  }, [listing?.price]);
  const renderOfferBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
      />
    ),
    [],
  );

  if (isPending) {
    return (
      <View style={styles.container}>
        <StatusState eyebrow="Loading" title="Opening listing" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.container}>
        <StatusState
          eyebrow="Not found"
          title="Listing unavailable"
          body="This bike may have sold, been removed, or moved back to draft."
          actionLabel="GO BACK"
          onAction={() => backOrReplace(router, "/(tabs)")}
        />
      </View>
    );
  }

  const images = listing.images?.length ? listing.images : [listing.image];
  const rideable = listing.condition !== "project";
  const sellerName = listing.sellerName ?? "Seller";
  const sellerId = listing.sellerId ?? listing.id;
  const topOfferText = topOffer ? formatUsd(topOffer) : "No offers yet";
  const isSellerViewingOwnListing = Boolean(
    activeView === "builder" && member?.id && listing.sellerId === member.id,
  );

  const openOfferSheet = () => {
    hapticMedium();
    setSelectedOffer("custom");
    setCustomOffer("");
    offerSheetRef.current?.present();
  };
  const submitOffer = async () => {
    if (myPendingOffer) {
      offerSheetRef.current?.dismiss();
      router.push({
        pathname: "/messages/[id]",
        params: {
          id: myPendingOffer.conversationId,
          sellerName,
          listingTitle: `${listing.year} ${listing.make} ${listing.model}`,
          pendingOfferAmount: String(myPendingOffer.amount),
          pendingOfferId: myPendingOffer.id,
          pendingOfferListingId: listing.id,
          pendingOfferSellerId: listing.sellerId ?? "",
        },
      });
      return;
    }

    const selectedOption = offerOptions.find((option) => option.key === selectedOffer);
    const offerAmount =
      selectedOffer === "custom"
        ? amountFromOfferInput(customOffer)
        : selectedOption?.amount ?? listing.price;

    if (!offerAmount) return;

    hapticMedium();
    try {
      const conversationId = await startConversation({
        participantId: listing.sellerId,
        participantName: sellerName,
        listingId: listing.id,
      });
      const offer = await createListingOffer({
        conversationId,
        listingId: listing.id,
        sellerId: listing.sellerId,
        amount: offerAmount,
      });
      const message = `Offer: ${formatUsd(offerAmount)} for ${listing.year} ${listing.make} ${listing.model}`;
      await sendConversationMessage(
        conversationId,
        message,
      );
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversation-offers", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["listing-top-offer", listing.id] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-offer", listing.id] });
      offerSheetRef.current?.dismiss();
      router.push({
        pathname: "/messages/[id]",
        params: {
          id: conversationId,
          sellerName,
          listingTitle: `${listing.year} ${listing.make} ${listing.model}`,
          sellerCity: listing.city ?? "",
          sellerMemberSince: listing.sellerMemberSince ?? "",
          sellerVerified: listing.sellerVerified ? "true" : "",
          pendingMessage: message,
          pendingOfferAmount: String(offerAmount),
          pendingOfferId: offer?.id ?? "",
          pendingOfferListingId: listing.id,
          pendingOfferSellerId: listing.sellerId ?? "",
        },
      });
    } catch (error) {
      Alert.alert(
        "Offer unavailable",
        error instanceof Error ? error.message : "Could not send this offer.",
      );
      queryClient.invalidateQueries({ queryKey: ["listing-top-offer", listing.id] });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PhotoCarousel
          images={images}
          rare={Boolean(listing.isRare)}
          topInset={insets.top}
          onBack={() => backOrReplace(router, "/(tabs)")}
        />

        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>
              {listing.make} {listing.model}
            </Text>
            {listing.viewers > 0 ? (
              <View style={styles.viewerBadge}>
                <View style={styles.viewerLed} />
                <Text style={styles.viewerBadgeText}>
                  {listing.viewers} looking
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.metaLine}>
            {listing.year} - {listing.mileage || "Mileage not listed"} - {(listing.city ?? "Location not set")}
          </Text>
          <View style={styles.pillRow}>
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>{rideable ? "Rideable" : "Project"}</Text>
            </View>
            {listing.isRare ? (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillText}>Rare find</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={[styles.section, styles.sellerSection]}>
          <Text style={styles.description}>
            <Text style={styles.descriptionSeller}>{sellerName}</Text>
            {" "}
            {listing.description || "No description yet."}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Pressable
            style={styles.sellerCard}
            onPress={() => router.push(`/builder/${sellerId}`)}
          >
            <View style={styles.sellerAvatar}>
              {listing.sellerAvatarUrl ? (
                <Image
                  source={{ uri: listing.sellerAvatarUrl }}
                  style={styles.sellerAvatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.sellerAvatarText}>
                  {sellerName[0]}
                </Text>
              )}
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>Sold by {sellerName}</Text>
              <Text style={styles.sellerMemberSince}>
                {(listing.city ?? "Location not set")} - Member since {listing.sellerMemberSince ?? "-"}
              </Text>
            </View>
            <Text style={styles.sellerArrow}>→</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.priceSummary}>
          <View style={styles.listedPriceColumn}>
            <Text style={styles.priceLabel}>Listed</Text>
            <Text style={styles.listedPrice}>{formatUsd(listing.price)}</Text>
            <Text
              style={[styles.topOfferLine, !topOffer && styles.emptyOfferPrice]}
              numberOfLines={1}
            >
              Top offer: {topOfferText}
            </Text>
          </View>
        </View>
        {isSellerViewingOwnListing ? (
          <Pressable style={styles.ownerButton} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.ownerButtonText}>Seller dashboard</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.offerButton} onPress={openOfferSheet}>
            <Text style={styles.offerButtonText}>Make offer</Text>
          </Pressable>
        )}
      </View>

      <BottomSheetModal
        ref={offerSheetRef}
        snapPoints={offerSnapPoints}
        backdropComponent={renderOfferBackdrop}
        enablePanDownToClose
        backgroundStyle={styles.offerSheetBg}
        handleIndicatorStyle={styles.offerSheetHandle}
      >
        <BottomSheetView style={styles.offerSheet}>
          <Text style={styles.offerSheetEyebrow}>Make offer</Text>
          <Text style={styles.offerSheetTitle}>
            {listing.year} {listing.make} {listing.model}
          </Text>
          <Text style={styles.offerSheetBody}>
            Choose a price or enter your own offer.
          </Text>

          <Pressable
            style={[
              styles.customOfferWrap,
              selectedOffer === "custom" && styles.customOfferWrapActive,
            ]}
            onPress={() => setSelectedOffer("custom")}
          >
            <Text style={styles.customOfferLabel}>Enter price</Text>
            <TextInput
              value={customOffer}
              onFocus={() => setSelectedOffer("custom")}
              onChangeText={(value) => {
                setSelectedOffer("custom");
                setCustomOffer(formatOfferInput(value));
              }}
              keyboardType="number-pad"
              placeholder={formatUsd(listing.price)}
              placeholderTextColor={COLORS.textFaint}
              style={styles.customOfferInput}
            />
          </Pressable>

          <View style={styles.offerOptionGrid}>
            {offerOptions.map((option) => {
              const active = selectedOffer === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.offerOption, active && styles.offerOptionActive]}
                  onPress={() => {
                    hapticSelection();
                    setSelectedOffer(option.key);
                  }}
                >
                  <Text style={[styles.offerOptionLabel, active && styles.offerOptionLabelActive]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.offerOptionPrice, active && styles.offerOptionPriceActive]}>
                    {formatUsd(option.amount)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.submitOfferButton} onPress={submitOffer}>
            <Text style={styles.submitOfferButtonText}>
              {myPendingOffer
                ? `View pending ${formatUsd(myPendingOffer.amount)} offer`
                : "Send offer"}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: S.screenContainer,
  scrollContent: {
    paddingBottom: 132,
  },

  // Carousel
  carouselSlide: {
    width: width,
    height: width * 1.08,
    backgroundColor: COLORS.surface,
  },
  carouselImage: S.cardImage,
  carouselImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  carouselImageFallbackText: {
    fontSize: 11,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textFaint,
  },
  photoBackButton: {
    position: "absolute",
    left: SPACING.page,
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.overlay35,
    alignItems: "center",
    justifyContent: "center",
  },
  rareBadge: {
    position: "absolute",
    top: SPACING.md,
    left: SPACING.page,
    backgroundColor: COLORS.accentAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rareBadgeText: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.white,
  },
  dots: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.whiteA50,
  },
  dotActive: {
    backgroundColor: COLORS.white,
  },
  counter: {
    position: "absolute",
    bottom: 16,
    right: SPACING.page,
    backgroundColor: COLORS.overlay50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  counterText: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 1,
    color: COLORS.white,
  },

  // Title
  titleBlock: {
    paddingHorizontal: SPACING.page,
    paddingTop: 22,
    paddingBottom: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  viewerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 1,
  },
  viewerLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.live,
  },
  viewerBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: F.monoBold,
    color: COLORS.textPrimary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metaLine: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  infoPill: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: COLORS.surfaceRaised,
  },
  infoPillText: {
    fontSize: 14,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },

  // Sections
  divider: S.dividerInset,
  section: S.section,
  sectionTitle: S.sectionTitle,
  description: {
    ...TYPE.body,
    fontSize: 18,
    lineHeight: 27,
    color: COLORS.textSecondary,
  },
  descriptionSeller: {
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },

  // Seller
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  sellerAvatar: {
    ...S.avatarBase,
    width: 64,
    height: 64,
    marginRight: 18,
    overflow: "hidden",
  },
  sellerAvatarImage: {
    width: "100%",
    height: "100%",
  },
  sellerAvatarText: {
    ...S.avatarText,
    fontSize: 24,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 18,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  sellerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: 4,
  },
  verifiedBadge: S.verifiedBadge,
  verifiedText: S.verifiedText,
  sellerType: {
    ...TYPE.monoSmall,
    letterSpacing: 1,
  },
  sellerMemberSince: {
    fontSize: 16,
    fontFamily: F.semibold,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  sellerArrow: S.menuArrow,
  sellerSection: {
    paddingBottom: 112,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 108,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: SPACING.page,
    paddingTop: 10,
    paddingBottom: 24,
  },
  priceSummary: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  listedPriceColumn: {
    flex: 1,
    minWidth: 0,
  },
  priceLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.textFaint,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  listedPrice: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  topOfferLine: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: F.bold,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyOfferPrice: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: F.semibold,
    color: COLORS.textMuted,
  },
  offerButton: {
    ...S.primaryButton,
    width: FOOTER_BUTTON_WIDTH,
    flexShrink: 0,
    minHeight: 54,
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 0,
  },
  offerButtonText: {
    ...S.primaryButtonText,
    fontSize: 17,
  },
  ownerButton: {
    ...S.primaryButton,
    width: FOOTER_BUTTON_WIDTH,
    flexShrink: 0,
    minHeight: 54,
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 0,
  },
  ownerButtonText: {
    ...S.primaryButtonText,
    fontSize: 15,
  },
  offerSheetBg: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  offerSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray300,
    marginBottom: 14,
  },
  offerSheet: {
    paddingHorizontal: SPACING.page,
    paddingBottom: 56,
  },
  offerSheetEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.monoBold,
    letterSpacing: 1.4,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  offerSheetTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  offerSheetBody: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  offerOptionGrid: {
    gap: 10,
    marginTop: 10,
  },
  offerOption: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
  },
  offerOptionActive: {
    borderColor: COLORS.black,
    backgroundColor: COLORS.black,
  },
  offerOptionLabel: {
    fontSize: 14,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  offerOptionLabelActive: {
    color: COLORS.white,
  },
  offerOptionPrice: {
    fontSize: 18,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  offerOptionPriceActive: {
    color: COLORS.white,
  },
  customOfferWrap: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  customOfferWrapActive: {
    borderColor: COLORS.black,
  },
  customOfferLabel: {
    fontSize: 14,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  customOfferInput: {
    minWidth: 128,
    textAlign: "right",
    fontSize: 20,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  submitOfferButton: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  submitOfferButtonText: {
    fontSize: 17,
    fontFamily: F.bold,
    color: COLORS.white,
  },
});
