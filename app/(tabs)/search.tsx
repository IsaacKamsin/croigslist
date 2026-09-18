import { COLORS, F, IMAGE_CACHE, SPACING, TYPE } from "@/constants/design";
import { keyboardScrollProps } from "@/components/KeyboardScreen";
import { hapticLight } from "@/hooks/useHaptics";
import { S } from "@/constants/styles";
import {
  fetchBuilders,
  fetchListings,
  type RegistryListing,
  type RegistryShop,
} from "@/lib/registry-db";
import { formatUsd } from "@/lib/formatters";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MASONRY_GAP = 12;

// ── Trending / recent searches ─────────────────────────────────────
const TRENDING = ["CAFE RACER", "PROJECT", "UNDER $5K", "MINNEAPOLIS", "BUILDERS", "RIDEABLE"];

// ── City filter ────────────────────────────────────────────────────
const CITIES = ["ALL", "MINNEAPOLIS", "ST. PAUL", "DULUTH", "ROCHESTER"] as const;
type CityFilter = (typeof CITIES)[number];

// ── Tag style helper ───────────────────────────────────────────────
function getTagStyles(tag: string) {
  switch (tag) {
    case "RIDEABLE":
      return { bg: { backgroundColor: COLORS.gray100, paddingHorizontal: 8, paddingVertical: 4 } as const, tone: "default" as const };
    case "PROJECT":
      return { bg: { backgroundColor: COLORS.black, paddingHorizontal: 8, paddingVertical: 4 } as const, tone: "light" as const };
    case "RARE":
      return { bg: { backgroundColor: COLORS.accentAlt, paddingHorizontal: 8, paddingVertical: 4 } as const, tone: "light" as const };
    default:
      return { bg: { backgroundColor: COLORS.surfaceRaised, paddingHorizontal: 8, paddingVertical: 4 } as const, tone: "default" as const };
  }
}

// ── Masonry height from id ─────────────────────────────────────────
const HEIGHT_RATIOS = [1.4, 1.1, 0.85, 1.25, 1.0, 1.35] as const;
function cardImageHeight(id: string, colWidth: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = hash * 31 + id.charCodeAt(i);
  return colWidth * HEIGHT_RATIOS[Math.abs(hash) % HEIGHT_RATIOS.length];
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
  sellerId?: string;
  city?: string;
  mileage?: string;
  sellerName?: string;
  description?: string;
  createdAt?: string;
  tags: string[];
};

type TaggedBuilder = {
  id: string;
  slug: string;
  kind?: "shop" | "profile";
  name: string;
  specialty: string;
  image: string;
  location?: string;
  builds: number;
  matchingBikeCount?: number;
};

type SearchData = {
  bikes: TaggedListing[];
  builders: TaggedBuilder[];
};

const EMPTY_BIKES: TaggedListing[] = [];
const EMPTY_BUILDERS: TaggedBuilder[] = [];

function tagListings(items: RegistryListing[]): TaggedListing[] {
  return items
    .filter((item) => item.status !== "sold")
    .map((item) => {
      const tags: string[] = [];
      if (item.isRare) tags.push("RARE");
      if (item.isProject || item.condition === "project") tags.push("PROJECT");
      if (!tags.includes("PROJECT")) tags.push("RIDEABLE");

      return {
        id: item.id,
        make: item.make,
        model: item.model,
        year: item.year,
        price: item.price,
        image: item.image,
        viewers: item.viewers,
        sellerId: item.sellerId,
        city: item.city,
        mileage: item.mileage,
        sellerName: item.sellerName,
        description: item.description,
        createdAt: item.createdAt,
        tags,
      };
    });
}

function tagBuilders(items: RegistryShop[]): TaggedBuilder[] {
  return items.map((item) => ({
    id: item.id,
    slug: item.slug,
    kind: item.kind,
    name: item.name,
    specialty: item.specialty,
    image: item.image,
    location: item.location,
    builds: item.builds,
  }));
}

function matchesCity(value: string | undefined, city: CityFilter) {
  return value?.toUpperCase().includes(city) ?? false;
}

function builderSectionTitle(query: string) {
  const normalized = query.trim().toLowerCase();
  if (normalized === "under $5k" || normalized === "under 5k") {
    return "Builders selling under $5K bikes";
  }
  if (normalized === "project") return "Builders with project bikes";
  if (normalized === "rare") return "Builders with rare bikes";
  if (normalized === "rideable") return "Builders with rideable bikes";
  if (normalized === "minneapolis") return "Builders in Minneapolis";
  if (["builder", "builders", "shop", "shops", "seller", "sellers"].includes(normalized)) {
    return "Builders";
  }
  return "Builders with matching bikes";
}

function sortListings(items: TaggedListing[], sort: SortOption) {
  const sorted = [...items];
  switch (sort) {
    case "NEWEST":
      return sorted.sort((a, b) => {
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return b.year - a.year;
      });
    case "PRICE ↑":
      return sorted.sort((a, b) => a.price - b.price);
    case "PRICE ↓":
      return sorted.sort((a, b) => b.price - a.price);
  }
}

// ── Masonry Card ───────────────────────────────────────────────────
function MasonryCard({
  item,
  colWidth,
  onPress,
}: {
  item: TaggedListing;
  colWidth: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.masonryCard, { width: colWidth }]} onPress={onPress}>
      <View
        style={[styles.masonryImgWrap, { width: colWidth, height: cardImageHeight(item.id, colWidth) }]}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.masonryImg}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE}
            recyclingKey={item.image}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>NO PHOTO</Text>
          </View>
        )}
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
      <Text style={styles.masonryPrice}>{formatUsd(item.price)}</Text>
      {item.tags.length > 0 && (
        <View style={styles.tagRow}>
          {item.tags.map((tag) => {
            const t = getTagStyles(tag);
            return (
              <View key={tag} style={t.bg}>
                <Text style={t.tone === "light" ? styles.tagTextLight : styles.tagTextDark}>
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

function BikeListResult({
  item,
  onPress,
}: {
  item: TaggedListing;
  onPress: () => void;
}) {
  const title = `${item.year} ${item.make} ${item.model}`;
  const detail = [formatUsd(item.price), item.city].filter(Boolean).join(" · ");
  const seller = item.sellerName ?? "Seller";

  return (
    <Pressable style={styles.bikeRow} onPress={onPress}>
      <View style={styles.bikeRowImageWrap}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.bikeRowImage}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE}
            recyclingKey={item.image}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>NO PHOTO</Text>
          </View>
        )}
      </View>
      <View style={styles.bikeRowCopy}>
        <Text style={styles.bikeRowTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.bikeRowDetail} numberOfLines={1}>
          {detail}
        </Text>
        <Text style={styles.bikeRowSeller} numberOfLines={1}>
          {seller}
        </Text>
        <View style={styles.tagRow}>
          {item.tags.slice(0, 2).map((tag) => {
            const t = getTagStyles(tag);
            return (
              <View key={tag} style={t.bg}>
                <Text style={t.tone === "light" ? styles.tagTextLight : styles.tagTextDark}>
                  {tag}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

function BuilderResult({
  item,
  onPress,
}: {
  item: TaggedBuilder;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.builderResult} onPress={onPress}>
      <View style={styles.builderImageWrap}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.builderImage}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE}
          />
        ) : (
          <Text style={styles.builderInitial}>{item.name[0]}</Text>
        )}
      </View>
      <View style={styles.builderCopy}>
        <Text style={styles.builderLabel}>BUILDER</Text>
        <Text style={styles.builderName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.builderMeta} numberOfLines={1}>
          {[item.specialty, item.location].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Text style={styles.builderCount}>
        {item.matchingBikeCount
          ? `${item.matchingBikeCount} match${item.matchingBikeCount === 1 ? "" : "es"}`
          : `${item.builds} bikes`}
      </Text>
    </Pressable>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState<CityFilter>("ALL");
  const [refine, setRefine] = useState<RefineFilter>("ALL");
  const [sort, setSort] = useState<SortOption>("NEWEST");
  const router = useRouter();
  const { width } = useWindowDimensions();
  const colWidth = (width - SPACING.page * 2 - MASONRY_GAP) / 2;
  const { data, isPending } = useQuery({
    queryKey: ["search-listings"],
    queryFn: async (): Promise<SearchData> => {
      const [listings, builders] = await Promise.all([
        fetchListings(),
        fetchBuilders(),
      ]);
      return {
        bikes: tagListings(listings),
        builders: tagBuilders(builders),
      };
    },
  });
  const listings = data?.bikes ?? EMPTY_BIKES;
  const builders = data?.builders ?? EMPTY_BUILDERS;

  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    const nextQuery = typeof params.q === "string" ? params.q : "";
    if (nextQuery) {
      setQuery(nextQuery);
      setRefine("ALL");
      setCity("ALL");
    }
  }, [params.q]);

  const { bikeResults, builderResults } = useMemo(() => {
    if (!hasQuery) {
      return { bikeResults: [] as TaggedListing[], builderResults: [] as TaggedBuilder[] };
    }

    const q = query.trim().toLowerCase();
    const isBuilderQuery = ["builder", "builders", "shop", "shops", "seller", "sellers"].includes(q);
    let filteredBikes = listings.filter(
      (r) =>
        r.make.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        String(r.year).includes(q) ||
        r.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        r.city?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        (q === "under $5k" && r.price < 5000) ||
        (q === "under 5k" && r.price < 5000),
    );
    const builderTextMatches = (r: TaggedBuilder) =>
        isBuilderQuery ||
        r.name.toLowerCase().includes(q) ||
        r.specialty.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q);
    let filteredBuilders = builders.filter(builderTextMatches);

    // City filter
    if (city !== "ALL") {
      filteredBikes = filteredBikes.filter((r) => matchesCity(r.city, city));
      filteredBuilders = filteredBuilders.filter((r) => matchesCity(r.location, city));
    }

    // Refine filter
    switch (refine) {
      case "RIDEABLE":
      case "PROJECT":
      case "RARE":
        filteredBikes = filteredBikes.filter((r) => r.tags.includes(refine));
        break;
    }

    const matchingBikeCounts = new Map<string, number>();
    filteredBikes.forEach((bike) => {
      if (!bike.sellerId) return;
      matchingBikeCounts.set(
        bike.sellerId,
        (matchingBikeCounts.get(bike.sellerId) ?? 0) + 1,
      );
    });
    const builderPool =
      city === "ALL"
        ? builders
        : builders.filter((builder) => matchesCity(builder.location, city));
    const mergedBuilders = new Map<string, TaggedBuilder>();
    filteredBuilders.forEach((builder) => {
      mergedBuilders.set(builder.id, {
        ...builder,
        matchingBikeCount: matchingBikeCounts.get(builder.id),
      });
    });
    builderPool.forEach((builder) => {
      const matchingBikeCount = matchingBikeCounts.get(builder.id);
      if (!matchingBikeCount || mergedBuilders.has(builder.id)) return;
      mergedBuilders.set(builder.id, { ...builder, matchingBikeCount });
    });

    return {
      bikeResults: sortListings(filteredBikes, sort),
      builderResults: [...mergedBuilders.values()].sort((a, b) => {
        const countDiff = (b.matchingBikeCount ?? 0) - (a.matchingBikeCount ?? 0);
        if (countDiff !== 0) return countDiff;
        return a.name.localeCompare(b.name);
      }),
    };
  }, [query, hasQuery, city, refine, sort, listings, builders]);

  // Pre-split columns for masonry
  const { left, right } = useMemo(() => {
    const l: TaggedListing[] = [];
    const r: TaggedListing[] = [];
    bikeResults.forEach((item, i) => (i % 2 === 0 ? l : r).push(item));
    return { left: l, right: r };
  }, [bikeResults]);

  const animateLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    hapticLight();
  };

  const cycleSort = () => {
    animateLayout();
    const idx = SORT_OPTIONS.indexOf(sort);
    setSort(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length]);
  };

  const resultCount = bikeResults.length + builderResults.length;
  const hasResults = resultCount > 0;
  const useListResults = bikeResults.length > 0 && bikeResults.length < 4;
  const queryLabel = query.trim();
  const bikeSummaryContext =
    queryLabel.toLowerCase() === "under $5k" || queryLabel.toLowerCase() === "under 5k"
      ? " under $5K"
      : queryLabel && bikeResults.length > 0 && builderResults.length === 0
        ? ` for ${queryLabel}`
        : "";
  const resultSummary = isPending
    ? "Searching..."
    : [
        bikeResults.length ? `${bikeResults.length} bike${bikeResults.length === 1 ? "" : "s"}${bikeSummaryContext}` : "",
        builderResults.length ? `${builderResults.length} builder${builderResults.length === 1 ? "" : "s"}` : "",
      ].filter(Boolean).join(" · ");
  const showBikeControls = bikeResults.length > 0 || refine !== "ALL" || builderResults.length === 0;
  const buildersTitle = builderSectionTitle(queryLabel);

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
          placeholder="Search bikes or builders..."
          placeholderTextColor={COLORS.textFaint}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => { setQuery(""); setRefine("ALL"); setCity("ALL"); }}
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
                onPress={() => { hapticLight(); setQuery(term); setRefine("ALL"); setCity("ALL"); }}
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
          style={styles.cityScroller}
          contentContainerStyle={styles.cityRow}
          {...keyboardScrollProps}
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

      {/* Condition filters */}
      {hasQuery && (
        <View style={styles.toolbar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.refineRow}
            {...keyboardScrollProps}
          >
            <Text style={styles.resultCount}>
              {resultSummary || `${resultCount} results`}
            </Text>
            {showBikeControls && REFINE_FILTERS.map((f) => {
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
          {showBikeControls ? (
            <Pressable onPress={cycleSort} hitSlop={8}>
              <Text style={styles.sortText}>{sort}</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Results */}
      {hasQuery && hasResults && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.masonry}
          {...keyboardScrollProps}
        >
          {bikeResults.length > 0 && (
            useListResults ? (
              <View style={styles.bikeListResults}>
                {bikeResults.map((item) => (
                  <BikeListResult
                    key={item.id}
                    item={item}
                    onPress={() => router.push(`/listing/${item.id}`)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.masonryGrid}>
                <View style={[styles.masonryCol, { width: colWidth }]}>
                  {left.map((item) => (
                    <MasonryCard
                      key={item.id}
                      item={item}
                      colWidth={colWidth}
                      onPress={() => router.push(`/listing/${item.id}`)}
                    />
                  ))}
                </View>
                <View style={[styles.masonryCol, { width: colWidth }]}>
                  {right.map((item) => (
                    <MasonryCard
                      key={item.id}
                      item={item}
                      colWidth={colWidth}
                      onPress={() => router.push(`/listing/${item.id}`)}
                    />
                  ))}
                </View>
              </View>
            )
          )}
          {builderResults.length > 0 && (
            <View style={styles.builderResults}>
              <Text style={styles.resultSectionTitle}>{buildersTitle}</Text>
              {builderResults.map((item) => (
                <BuilderResult
                  key={`builder-${item.id}`}
                  item={item}
                  onPress={() => {
                    router.push(item.kind === "profile" ? `/builder/${item.slug}` : `/shop/${item.slug}`);
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Searched but no results */}
      {hasQuery && !isPending && !hasResults && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>NOTHING HERE</Text>
          <Text style={styles.emptyBody}>
            No matches for {query}. Try a different bike, builder, or location.
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
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    ...S.input,
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    fontSize: 15,
    paddingHorizontal: 16,
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
  cityScroller: {
    maxHeight: 36,
    flexGrow: 0,
  },
  cityRow: {
    paddingHorizontal: SPACING.page,
    gap: 6,
    paddingBottom: 6,
    alignItems: "center",
  },
  cityChip: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 0,
    height: 28,
    justifyContent: "center",
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
    paddingTop: 8,
    paddingBottom: 14,
  },
  refineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: SPACING.page,
    flex: 1,
  },
  resultCount: {
    fontSize: 13,
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
    paddingHorizontal: SPACING.page,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  bikeListResults: {
    gap: SPACING.md,
  },
  bikeRow: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  bikeRowImageWrap: {
    width: 118,
    height: 92,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceRaised,
  },
  bikeRowImage: {
    width: "100%",
    height: "100%",
  },
  bikeRowCopy: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  bikeRowTitle: {
    fontSize: 18,
    lineHeight: 21,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
    textTransform: "uppercase",
  },
  bikeRowDetail: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  bikeRowSeller: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  builderResults: {
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  resultSectionTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  builderResult: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  builderImageWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  builderImage: {
    width: "100%",
    height: "100%",
  },
  builderInitial: {
    fontSize: 19,
    fontFamily: F.bold,
    color: COLORS.textMuted,
  },
  builderCopy: {
    flex: 1,
    minWidth: 0,
  },
  builderLabel: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 1.6,
    color: COLORS.textFaint,
    marginBottom: 3,
  },
  builderName: {
    fontSize: 18,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
  },
  builderMeta: {
    fontSize: 13,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  builderCount: {
    fontSize: 12,
    fontFamily: F.monoBold,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
  masonryGrid: {
    flexDirection: "row",
    gap: MASONRY_GAP,
  },
  masonryCol: {
    gap: MASONRY_GAP,
  },
  masonryCard: {},
  masonryImgWrap: {
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  masonryImg: { width: "100%", height: "100%" },
  imageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceRaised,
  },
  imageFallbackText: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.textFaint,
  },
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
    letterSpacing: 0,
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
  empty: {
    ...S.emptyContainer,
    width: "100%",
    paddingHorizontal: SPACING.page,
  },
  emptyTitle: S.emptyTitle,
  emptyBody: {
    ...S.emptyBody,
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    flexShrink: 1,
  },
});
