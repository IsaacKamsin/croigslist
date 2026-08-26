import { COLORS, F, IMAGE_CACHE, IMAGE_PLACEHOLDER, SPACING, TYPE } from "@/constants/design";
import { hapticMedium, hapticSelection } from "@/hooks/useHaptics";
import { S } from "@/constants/styles";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
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

// ── Mock data ────────────────────────────────────────────────────────
const MOCK_LISTING = {
  id: "1",
  year: 1975,
  make: "Honda",
  model: "CB550",
  price: 4200,
  city: "Minneapolis",
  mileage: 23400,
  rideable: true,
  rare: false,
  description:
    "Clean survivor. Original paint. Carbs rebuilt 2024. New tires, chain, and battery. Runs strong. Title in hand.",
  images: [
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=80",
    "https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=900&q=80",
    "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=900&q=80",
    "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&q=80",
  ],
  seller: {
    id: "u1",
    name: "Jake Morrison",
    type: "rider",
    verified: true,
    memberSince: "2025",
  },
  specs: [
    { label: "ENGINE", value: "544cc Inline-4" },
    { label: "TRANSMISSION", value: "4-speed" },
    { label: "FRAME", value: "Steel twin cradle" },
    { label: "WEIGHT", value: "423 lbs" },
    { label: "BRAKES", value: "Disc / Drum" },
    { label: "FUEL", value: "3.4 gal" },
  ],
};

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

// ── Spec Grid ────────────────────────────────────────────────────────
function SpecGrid({ specs }: { specs: { label: string; value: string }[] }) {
  return (
    <View style={styles.specGrid}>
      {specs.map((spec, i) => (
        <View key={i} style={styles.specCell}>
          <Text style={styles.specLabel}>{spec.label}</Text>
          <Text style={styles.specValue}>{spec.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const listing = MOCK_LISTING;

  const handleMessageSeller = () => {
    hapticMedium();
    router.push({
      pathname: "/messages/[threadId]",
      params: {
        threadId: listing.seller.id,
        sellerName: listing.seller.name,
        listingTitle: `${listing.year} ${listing.make} ${listing.model}`,
      },
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <PhotoCarousel images={listing.images} rare={listing.rare} />

      {/* Title block */}
      <View style={styles.titleBlock}>
        <Text style={styles.year}>{listing.year}</Text>
        <Text style={styles.title}>
          {listing.make} {listing.model}
        </Text>
        <Text style={styles.price}>${listing.price.toLocaleString()}</Text>
      </View>

      {/* Quick facts */}
      <View style={styles.factsRow}>
        <View style={styles.fact}>
          <Text style={styles.factValue}>
            {listing.mileage.toLocaleString()}
          </Text>
          <Text style={styles.factLabel}>MILES</Text>
        </View>
        <View style={styles.factDivider} />
        <View style={styles.fact}>
          <Text style={styles.factValue}>{listing.city.toUpperCase()}</Text>
          <Text style={styles.factLabel}>LOCATION</Text>
        </View>
        <View style={styles.factDivider} />
        <View style={styles.fact}>
          <Text
            style={[
              styles.factValue,
              { color: listing.rideable ? COLORS.success : COLORS.error },
            ]}
          >
            {listing.rideable ? "YES" : "NO"}
          </Text>
          <Text style={styles.factLabel}>RIDEABLE</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DESCRIPTION</Text>
        <Text style={styles.description}>{listing.description}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SPECIFICATIONS</Text>
        <SpecGrid specs={listing.specs} />
      </View>

      <View style={styles.divider} />

      {/* Seller */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SELLER</Text>
        <Pressable
          style={styles.sellerCard}
          onPress={() => router.push(`/builder/${listing.seller.id}`)}
        >
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerAvatarText}>
              {listing.seller.name[0]}
            </Text>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{listing.seller.name}</Text>
            <View style={styles.sellerMeta}>
              {listing.seller.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>VERIFIED</Text>
                </View>
              )}
              <Text style={styles.sellerType}>
                {listing.seller.type.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.sellerMemberSince}>
              Member since {listing.seller.memberSince}
            </Text>
          </View>
          <Text style={styles.sellerArrow}>→</Text>
        </Pressable>
      </View>

      {/* Contact button */}
      <View style={styles.actions}>
        <Pressable style={styles.contactButton} onPress={handleMessageSeller}>
          <Text style={styles.contactButtonText}>MESSAGE SELLER</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: S.screenContainer,

  // Carousel
  carouselSlide: {
    width: width,
    height: width * 1.15,
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
    width: 6,
    height: 6,
    backgroundColor: COLORS.whiteA35,
  },
  dotActive: {
    backgroundColor: COLORS.white,
    width: 20,
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
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  year: {
    fontSize: 11,
    fontFamily: F.mono,
    letterSpacing: 2,
    color: COLORS.textMuted,
  },
  title: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  price: {
    ...TYPE.price,
    marginTop: SPACING.sm,
  },

  // Facts
  factsRow: {
    flexDirection: "row",
    paddingHorizontal: SPACING.page,
    paddingVertical: SPACING.lg,
  },
  fact: {
    flex: 1,
    alignItems: "center",
  },
  factValue: {
    fontSize: 14,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  factLabel: {
    ...TYPE.label,
    letterSpacing: 2,
    marginTop: 4,
  },
  factDivider: {
    width: 0.5,
    backgroundColor: COLORS.divider,
  },

  // Sections
  divider: S.dividerInset,
  section: S.section,
  sectionTitle: S.sectionTitle,
  description: {
    ...TYPE.body,
    lineHeight: 24,
    color: COLORS.textSecondary,
  },

  // Spec grid
  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  specCell: {
    width: "50%",
    paddingVertical: 14,
    paddingRight: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.divider,
  },
  specLabel: {
    ...TYPE.label,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  specValue: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
  },

  // Seller
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  sellerAvatar: {
    ...S.avatarBase,
    width: 44,
    height: 44,
    marginRight: SPACING.md,
  },
  sellerAvatarText: {
    ...S.avatarText,
    fontSize: 18,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 15,
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
    fontSize: 11,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sellerArrow: S.menuArrow,

  // Actions
  actions: S.actionsFooter,
  contactButton: S.primaryButton,
  contactButtonText: S.primaryButtonText,
});
