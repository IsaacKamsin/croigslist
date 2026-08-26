import { COLORS, F, IMAGE_CACHE, IMAGE_PLACEHOLDER, SPACING, TYPE } from "@/constants/design";
import { hapticLight } from "@/hooks/useHaptics";
import { S } from "@/constants/styles";
import {
  JUST_LISTED,
  PROJECT_BIKES,
  RARE_FINDS,
  UNDER_5K,
} from "@/data/registry";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_W = Dimensions.get("window").width;
const MASONRY_GAP = 12;
const COL_W = (SCREEN_W - SPACING.page * 2 - MASONRY_GAP) / 2;

// ── Trending / recent searches ─────────────────────────────────────
const TRENDING = ["CB750", "SR400", "R NineT", "Bonneville", "CX500", "KZ650"];

// ── City filter ────────────────────────────────────────────────────
const CITIES = ["ALL", "MINNEAPOLIS", "ST. PAUL", "DULUTH", "ROCHESTER"] as const;
type CityFilter = (typeof CITIES)[number];

// Mock city assignment based on listing id hash
function getCity(id: string): string {
  const cities = ["Minneapolis", "St. Paul", "Duluth", "Rochester"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = hash * 31 + id.charCodeAt(i);
  return cities[Math.abs(hash) % cities.length];
}

// ── Tag style helper ───────────────────────────────────────────────
function getTagStyles(tag: string) {
  switch (tag) {
    case "RIDEABLE":
      return { bg: { backgroundColor: COLORS.accent, paddingHorizontal: 6, paddingVertical: 2 } as const, light: false };
    case "PROJECT":
      return { bg: { backgroundColor: COLORS.black, paddingHorizontal: 6, paddingVertical: 2 } as const, light: true };
    case "RARE":
      return { bg: { backgroundColor: COLORS.accentAlt, paddingHorizontal: 6, paddingVertical: 2 } as const, light: true };
    default:
      return { bg: { backgroundColor: COLORS.surface, paddingHorizontal: 6, paddingVertical: 2 } as const, light: false };
  }
}

// ── Masonry height from id ─────────────────────────────────────────
const HEIGHT_RATIOS = [1.4, 1.1, 0.85, 1.25, 1.0, 1.35] as const;
function cardImageHeight(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = hash * 31 + id.charCodeAt(i);
  return COL_W * HEIGHT_RATIOS[Math.abs(hash) % HEIGHT_RATIOS.length];
}

// ── Filters (only shown after search) ──────────────────────────────
const REFINE_FILTERS = ["ALL", "RIDEABLE", "PROJECT", "RARE"] as const;
type RefineFilter = (typeof REFINE_FILTERS)[number];

const SORT_OPTIONS = ["NEWEST", "PRICE ↑", "PRICE ↓"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

// ── Tag each listing ───────────────────────────────────────────────
type TaggedListing = {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  image: string;
  viewers: number;
  tags: string[];
};

function tagListings(): TaggedListing[] {
  const seen = new Set<string>();
  const result: TaggedListing[] = [];
  const add = (items: typeof JUST_LISTED, tag: string) => {
    for (const item of items) {
      if (seen.has(item.id)) {
        const existing = result.find((r) => r.id === item.id);
        if (existing && !existing.tags.includes(tag)) existing.tags.push(tag);
        continue;
      }
      seen.add(item.id);
      result.push({ ...item, tags: [tag] });
    }
  };
  add(JUST_LISTED, "RIDEABLE");
  add(UNDER_5K, "RIDEABLE");
  add(RARE_FINDS, "RARE");
  add(PROJECT_BIKES, "PROJECT");
  return result;
}

const LISTINGS = tagListings();

function sortListings(items: TaggedListing[], sort: SortOption) {
  const sorted = [...items];
  switch (sort) {
    case "NEWEST":
      return sorted.sort((a, b) => b.year - a.year);
    case "PRICE ↑":
      return sorted.sort((a, b) => a.price - b.price);
    case "PRICE ↓":
      return sorted.sort((a, b) => b.price - a.price);
  }
}

// ── Masonry Card ───────────────────────────────────────────────────
function MasonryCard({
  item,
  onPress,
}: {
  item: TaggedListing;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.masonryCard} onPress={onPress}>
      <View
        style={[styles.masonryImgWrap, { height: cardImageHeight(item.id) }]}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.masonryImg}
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
      <Text style={styles.masonryMeta}>
        {item.year} · {item.make}
      </Text>
      <Text style={styles.masonryModel}>{item.model}</Text>
      <Text style={styles.masonryPrice}>
        ${item.price.toLocaleString()}
      </Text>
      {item.tags.length > 0 && (
        <View style={styles.tagRow}>
          {item.tags.map((tag) => {
            const t = getTagStyles(tag);
            return (
              <View key={tag} style={t.bg}>
                <Text style={t.light ? styles.tagTextLight : styles.tagTextDark}>
                  {tag}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<CityFilter>("ALL");
  const [refine, setRefine] = useState<RefineFilter>("ALL");
  const [sort, setSort] = useState<SortOption>("NEWEST");
  const router = useRouter();

  const hasQuery = query.trim().length > 0;

  const results = useMemo(() => {
    if (!hasQuery) return [];

    const q = query.trim().toLowerCase();
    let filtered = LISTINGS.filter(
      (r) =>
        r.make.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        String(r.year).includes(q),
    );

    // City filter
    if (city !== "ALL") {
      filtered = filtered.filter(
        (r) => getCity(r.id).toUpperCase() === city,
      );
    }

    // Refine filter
    switch (refine) {
      case "RIDEABLE":
      case "PROJECT":
      case "RARE":
        filtered = filtered.filter((r) => r.tags.includes(refine));
        break;
    }

    return sortListings(filtered, sort);
  }, [query, hasQuery, city, refine, sort]);

  // Pre-split columns for masonry
  const { left, right } = useMemo(() => {
    const l: TaggedListing[] = [];
    const r: TaggedListing[] = [];
    results.forEach((item, i) => (i % 2 === 0 ? l : r).push(item));
    return { left: l, right: r };
  }, [results]);

  const animateLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    hapticLight();
  };

  const cycleSort = () => {
    animateLayout();
    const idx = SORT_OPTIONS.indexOf(sort);
    setSort(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length]);
  };

  const hasResults = results.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SEARCH</Text>
      </View>

      {/* Search input — always prominent */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Year, make, model..."
          placeholderTextColor={COLORS.textFaint}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => { setQuery(""); setRefine("ALL"); }}
            hitSlop={12}
            style={styles.clearBtn}
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* No query — show trending chips */}
      {!hasQuery && (
        <View style={styles.trendingWrap}>
          <Text style={styles.trendingLabel}>TRENDING IN THE REGISTRY</Text>
          <View style={styles.trendingChips}>
            {TRENDING.map((term) => (
              <Pressable
                key={term}
                style={styles.trendingChip}
                onPress={() => { hapticLight(); setQuery(term); }}
              >
                <Text style={styles.trendingChipText}>{term}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* City filter — appears after typing */}
      {hasQuery && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityRow}
        >
          {CITIES.map((c) => {
            const active = city === c;
            return (
              <Pressable
                key={c}
                onPress={() => { animateLayout(); setCity(c); }}
                style={[styles.cityChip, active && styles.cityChipActive]}
              >
                <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Condition filters — only after search has results */}
      {hasQuery && hasResults && (
        <View style={styles.toolbar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.refineRow}
          >
            <Text style={styles.resultCount}>{results.length}</Text>
            {REFINE_FILTERS.map((f) => {
              const active = refine === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => { animateLayout(); setRefine(f); }}
                  hitSlop={4}
                >
                  <Text
                    style={[styles.refineText, active && styles.refineTextActive]}
                  >
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={cycleSort} hitSlop={8}>
            <Text style={styles.sortText}>{sort}</Text>
          </Pressable>
        </View>
      )}

      {/* Results */}
      {hasQuery && hasResults && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.masonry}
        >
          <View style={styles.masonryCol}>
            {left.map((item) => (
              <MasonryCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/listing/${item.id}`)}
              />
            ))}
          </View>
          <View style={styles.masonryCol}>
            {right.map((item) => (
              <MasonryCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/listing/${item.id}`)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Searched but no results */}
      {hasQuery && !hasResults && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>NOTHING HERE</Text>
          <Text style={styles.emptyBody}>
            No matches for "{query}". Try a different year, make, or model.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: S.screenContainer,
  header: S.screenHeader,
  title: S.screenTitle,

  // Search input
  searchRow: {
    paddingHorizontal: SPACING.page,
    marginBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    ...S.input,
    flex: 1,
    fontSize: 17,
  },
  clearBtn: {
    marginLeft: SPACING.sm,
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.textMuted,
  },

  // Trending chips — empty state
  trendingWrap: {
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.xl,
  },
  trendingLabel: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.textFaint,
    marginBottom: SPACING.md,
  },
  trendingChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  trendingChip: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  trendingChipText: {
    fontSize: 13,
    fontFamily: F.medium,
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },

  // City chips
  cityRow: {
    paddingHorizontal: SPACING.page,
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  cityChip: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cityChipActive: {
    borderColor: COLORS.black,
    backgroundColor: COLORS.black,
  },
  cityChipText: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
  },
  cityChipTextActive: {
    color: COLORS.white,
  },

  // Toolbar (only after results)
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: SPACING.page,
    paddingVertical: SPACING.sm,
  },
  refineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.page,
    flex: 1,
  },
  resultCount: {
    fontSize: 14,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  refineText: {
    fontSize: 9,
    fontFamily: F.monoMedium,
    letterSpacing: 1,
    color: COLORS.textFaint,
  },
  refineTextActive: {
    color: COLORS.textPrimary,
    fontFamily: F.monoBold,
  },
  sortText: {
    fontSize: 10,
    fontFamily: F.monoMedium,
    letterSpacing: 1,
    color: COLORS.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 1,
    marginLeft: SPACING.sm,
  },

  // Masonry grid
  masonry: {
    flexDirection: "row",
    paddingHorizontal: SPACING.page,
    gap: MASONRY_GAP,
    paddingBottom: SPACING.xl,
  },
  masonryCol: {
    width: COL_W,
    gap: MASONRY_GAP,
  },
  masonryCard: {
    width: COL_W,
  },
  masonryImgWrap: {
    width: COL_W,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  masonryImg: { width: "100%", height: "100%" },
  viewerBadge: S.viewerBadge,
  viewerLed: S.viewerLed,
  viewerText: S.viewerText,
  masonryMeta: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.textFaint,
    letterSpacing: 1,
    marginTop: 8,
  },
  masonryModel: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 1,
    letterSpacing: -0.3,
  },
  masonryPrice: {
    fontSize: 13,
    fontFamily: F.monoBold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tagTextDark: {
    ...TYPE.tag,
    color: COLORS.black,
    letterSpacing: 1.5,
  },
  tagTextLight: {
    ...TYPE.tag,
    color: COLORS.white,
    letterSpacing: 1.5,
  },

  // Empty state (searched, no results)
  empty: S.emptyContainer,
  emptyTitle: S.emptyTitle,
  emptyBody: S.emptyBody,
});
