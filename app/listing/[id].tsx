import { StatusState } from "@/components/StatusState";
import { COLORS, F, IMAGE_CACHE, IMAGE_PLACEHOLDER, SPACING, TYPE } from "@/constants/design";
import { hapticMedium, hapticSelection } from "@/hooks/useHaptics";
import { S } from "@/constants/styles";
import { fetchListingById } from "@/lib/registry-db";
import { formatUsd } from "@/lib/formatters";
import { startConversation } from "@/lib/messages-db";
import { backOrReplace } from "@/lib/navigation";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

// ── Photo Carousel ───────────────────────────────────────────────────
function PhotoCarousel({ images, rare }: { images: string[]; rare: boolean }) {
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
            <Image
              source={{ uri: item }}
              style={styles.carouselImage}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE}
              placeholder={IMAGE_PLACEHOLDER}
            />
          </View>
        )}
      />

      {rare && (
        <View style={styles.rareBadge}>
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
  const { data: listing, isPending } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id),
    enabled: Boolean(id),
  });

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

  const handleMessageSeller = async () => {
    hapticMedium();
    const conversationId = await startConversation({
      participantId: listing.sellerId,
      participantName: sellerName,
      listingId: listing.id,
    });
    router.push({
      pathname: "/messages/[id]",
      params: {
        id: conversationId,
        sellerName,
        listingTitle: `${listing.year} ${listing.make} ${listing.model}`,
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PhotoCarousel images={images} rare={Boolean(listing.isRare)} />

        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            {listing.make} {listing.model}
          </Text>
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

        <View style={styles.section}>
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
              <Text style={styles.sellerAvatarText}>
                {sellerName[0]}
              </Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>Sold by {sellerName}</Text>
              <Text style={styles.sellerMemberSince}>
                {(listing.city ?? "Location not set")} - Member since {listing.sellerMemberSince ?? "-"}
              </Text>
            </View>
            <Text style={styles.sellerArrow}>→</Text>
          </Pressable>
          <View style={styles.sellerActions}>
            <Pressable style={styles.visitButton} onPress={() => router.push(`/builder/${sellerId}`)}>
              <Text style={styles.visitButtonText}>Visit shop</Text>
            </Pressable>
            <Pressable style={styles.visitButton} onPress={handleMessageSeller}>
              <Text style={styles.visitButtonText}>Ask a question</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomPrice}>{formatUsd(listing.price)}</Text>
        <Pressable style={styles.offerButton} onPress={handleMessageSeller}>
          <Text style={styles.offerButtonText}>Make offer</Text>
        </Pressable>
        <Pressable style={styles.buyButton} onPress={handleMessageSeller}>
          <Text style={styles.buyButtonText}>Buy</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: S.screenContainer,
  scrollContent: {
    paddingBottom: 126,
  },

  // Carousel
  carouselSlide: {
    width: width,
    height: width * 1.08,
    backgroundColor: COLORS.surface,
  },
  carouselImage: S.cardImage,
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
  title: {
    fontSize: 20,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
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
  sellerActions: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  visitButton: {
    ...S.secondaryButton,
    flex: 1,
    minHeight: 52,
    borderRadius: 6,
    paddingVertical: 0,
  },
  visitButtonText: {
    ...S.secondaryButtonText,
    fontSize: 17,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 96,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.page,
    paddingTop: 12,
    paddingBottom: 24,
  },
  bottomPrice: {
    flex: 1,
    fontSize: 25,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  offerButton: {
    ...S.secondaryButton,
    minHeight: 54,
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 0,
  },
  offerButtonText: {
    ...S.secondaryButtonText,
    fontSize: 17,
  },
  buyButton: {
    ...S.primaryButton,
    minHeight: 54,
    borderRadius: 4,
    paddingHorizontal: 28,
    paddingVertical: 0,
  },
  buyButtonText: {
    ...S.primaryButtonText,
    fontSize: 17,
  },
});
