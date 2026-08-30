/**
 * Category listing screen — shows the full collection behind a registry
 * section's "SEE ALL" link (Just listed, Under $5K, Project bikes).
 */
import { COLORS, F, IMAGE_CACHE, IMAGE_PLACEHOLDER, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { fetchRegistryData, type RegistryListing } from "@/lib/registry-db";
import { formatUsd } from "@/lib/formatters";
import { backOrReplace } from "@/lib/navigation";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_W = Dimensions.get("window").width;
const GAP = 12;
const CARD_W = (SCREEN_W - SPACING.page * 2 - GAP) / 2;

type CategoryConfig = {
  title: string;
  sub: string;
  dataKey: "justListed" | "under5k" | "projectBikes";
};

const CATEGORIES: Record<string, CategoryConfig> = {
  "just-listed": {
    title: "Just listed",
    sub: "Ink's still wet. First looks for members only.",
    dataKey: "justListed",
  },
  "under-5k": {
    title: "Under $5K",
    sub: "Serious machines. Reasonable money. No compromises.",
    dataKey: "under5k",
  },
  "project-bikes": {
    title: "Project bikes",
    sub: "Rough around the edges. Priced for the ambitious.",
    dataKey: "projectBikes",
  },
};

export default function CategoryScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();

  const config = CATEGORIES[key ?? ""];
  const { data: items = [] } = useQuery({
    queryKey: ["listing-category", config?.dataKey],
    queryFn: async () => {
      const data = await fetchRegistryData();
      return config ? data[config.dataKey] : [];
    },
    enabled: Boolean(config),
    initialData: [] as RegistryListing[],
  });

  const { left, right } = useMemo(() => {
    const l: RegistryListing[] = [];
    const r: RegistryListing[] = [];
    items.forEach((item, i) => (i % 2 === 0 ? l : r).push(item));
    return { left: l, right: r };
  }, [items]);

  if (!config) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => backOrReplace(router, "/(tabs)")} hitSlop={12}>
            <Text style={styles.back}>← BACK</Text>
          </Pressable>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>NOT FOUND</Text>
          <Text style={styles.emptyBody}>Unknown category {key}.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => backOrReplace(router, "/(tabs)")} hitSlop={12}>
          <Text style={styles.back}>← BACK</Text>
        </Pressable>
      </View>
      <View style={styles.divider} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        removeClippedSubviews
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.sub}>{config.sub}</Text>
          <Text style={styles.count}>{items.length} LISTINGS</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.col}>
            {left.map((item) => (
              <Card
                key={item.id}
                item={item}
                onPress={() => router.push(`/listing/${item.id}`)}
              />
            ))}
          </View>
          <View style={styles.col}>
            {right.map((item) => (
              <Card
                key={item.id}
                item={item}
                onPress={() => router.push(`/listing/${item.id}`)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({
  item,
  onPress,
}: {
  item: RegistryListing;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardImgWrap}>
        <Image
          source={{ uri: item.image }}
          style={styles.cardImg}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
          placeholder={IMAGE_PLACEHOLDER}
          recyclingKey={item.image}
        />
        {item.viewers > 0 && (
          <View style={styles.viewerBadge}>
            <View style={styles.viewerLed} />
            <Text style={styles.viewerText}>{item.viewers}</Text>
          </View>
        )}
      </View>
      <Text style={styles.meta}>
        {item.year} · {item.make}
      </Text>
      <Text style={styles.model}>{item.model}</Text>
      <Text style={styles.price}>{formatUsd(item.price)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  back: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.textPrimary,
  },
  divider: S.divider,
  scroll: { paddingBottom: SPACING.xl },

  titleBlock: {
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
  },
  sub: {
    fontSize: 12,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  count: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textFaint,
    marginTop: 10,
  },

  grid: {
    flexDirection: "row",
    paddingHorizontal: SPACING.page,
    gap: GAP,
  },
  col: { width: CARD_W, gap: GAP },

  card: { width: CARD_W },
  cardImgWrap: {
    width: CARD_W,
    height: CARD_W * 1.3,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  cardImg: { width: "100%", height: "100%" },
  viewerBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.overlay50,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  viewerLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.live,
  },
  viewerText: { fontSize: 9, fontFamily: F.monoBold, color: COLORS.white },
  meta: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.textFaint,
    letterSpacing: 1,
    marginTop: 8,
  },
  model: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 1,
    letterSpacing: 0,
  },
  price: {
    fontSize: 13,
    fontFamily: F.monoBold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },

  empty: S.emptyContainer,
  emptyTitle: S.emptyTitle,
  emptyBody: S.emptyBody,
});
