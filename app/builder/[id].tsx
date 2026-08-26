import { COLORS, F, IMAGE_CACHE, SPACING, TYPE } from "@/constants/design";
import { S } from "@/constants/styles";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const GRID_GAP = SPACING.sm;
const CARD_WIDTH = (width - SPACING.page * 2 - GRID_GAP) / 2;

const MOCK_BUILDER = {
  id: "u1",
  name: "Twin Cities Moto Co.",
  type: "shop",
  city: "Minneapolis",
  verified: true,
  memberSince: "2025",
  bio: "Full-service vintage motorcycle shop. Specializing in Japanese classics from the 60s–80s. Carb rebuilds, wiring, frame-up restorations.",
  listings: [
    {
      id: "1",
      year: 1975,
      make: "Honda",
      model: "CB550",
      price: 4200,
      image:
        "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&q=80",
    },
    {
      id: "2",
      year: 1982,
      make: "Yamaha",
      model: "XJ650",
      price: 3100,
      image:
        "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80",
    },
    {
      id: "7",
      year: 1978,
      make: "Suzuki",
      model: "GS750",
      price: 5600,
      image:
        "https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=500&q=80",
    },
  ],
};

export default function BuilderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const builder = MOCK_BUILDER;

  const handleMessage = () => {
    router.push({
      pathname: "/messages/[threadId]",
      params: {
        threadId: builder.id,
        sellerName: builder.name,
      },
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{builder.name[0]}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{builder.name}</Text>
          <View style={styles.metaRow}>
            {builder.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            )}
            <Text style={styles.type}>{builder.type.toUpperCase()}</Text>
          </View>
          <Text style={styles.location}>
            {builder.city.toUpperCase()} · SINCE {builder.memberSince}
          </Text>
        </View>
      </View>

      {/* Bio */}
      <View style={styles.bioBlock}>
        <Text style={styles.bio}>{builder.bio}</Text>
      </View>

      <View style={styles.divider} />

      {/* Listings */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>LISTINGS</Text>
          <Text style={styles.sectionCount}>{builder.listings.length}</Text>
        </View>

        <View style={styles.grid}>
          {builder.listings.map((item) => (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() => router.push(`/listing/${item.id}`)}
            >
              <View style={styles.cardImageWrap}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.cardImage}
                  contentFit="cover"
                  cachePolicy={IMAGE_CACHE}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardMeta}>
                  {item.year} · {item.make.toUpperCase()}
                </Text>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.model}
                </Text>
                <Text style={styles.cardPrice}>
                  ${item.price.toLocaleString()}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Contact */}
      <View style={styles.actions}>
        <Pressable style={styles.contactButton} onPress={handleMessage}>
          <Text style={styles.contactButtonText}>MESSAGE</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,

  // Header
  header: {
    flexDirection: "row",
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.page,
    gap: SPACING.md,
    alignItems: "center",
  },
  avatar: {
    ...S.avatarBase,
    width: 52,
    height: 52,
  },
  avatarText: {
    ...S.avatarText,
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    ...TYPE.sectionHeader,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: 3,
  },
  verifiedBadge: S.verifiedBadge,
  verifiedText: S.verifiedText,
  type: {
    ...TYPE.monoSmall,
    fontFamily: F.monoMedium,
    letterSpacing: 1.5,
  },
  location: {
    ...TYPE.monoSmall,
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.textFaint,
    marginTop: 2,
  },

  // Bio
  bioBlock: {
    paddingHorizontal: SPACING.page,
    paddingBottom: SPACING.lg,
  },
  bio: {
    ...TYPE.bodySmall,
    color: COLORS.textSecondary,
  },

  // Shared
  divider: S.dividerInset,
  section: S.section,
  sectionLabel: {
    ...TYPE.label,
    letterSpacing: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sectionCount: {
    fontSize: 11,
    fontFamily: F.monoMedium,
    letterSpacing: 1,
    color: COLORS.textMuted,
  },

  // Listings grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  card: {
    width: CARD_WIDTH,
  },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  cardImage: S.cardImage,
  cardInfo: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  cardMeta: S.cardMeta,
  cardTitle: S.cardTitle,
  cardPrice: S.cardPrice,

  // Actions
  actions: S.actionsFooter,
  contactButton: S.primaryButton,
  contactButtonText: S.primaryButtonText,
});
