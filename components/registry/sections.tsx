/**
 * Registry section components
 * Each section is isolated and memo'd for scroll performance
 */
import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { formatUsd } from "@/lib/formatters";
import type { RegistryListing, RegistryShop, SoldListing } from "@/lib/registry-db";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { HeartIcon } from "phosphor-react-native";
import React from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SectionHead, ViewerDot, s as shared } from "./shared";

const P = SPACING.page;
const SCREEN_W = Dimensions.get("window").width;
const GRID_GAP = 12;
const GRID_CARD_W = (SCREEN_W - P * 2 - GRID_GAP) / 2;

// ── Hero ─────────────────────────────────────────────────────────────
export const HeroSection = React.memo(
  ({
    featured,
    onPress,
  }: {
    featured: RegistryListing;
    onPress: () => void;
  }) => (
    <Pressable style={s.heroWrap} onPress={onPress}>
      <View style={s.hero}>
        <Image
          source={{ uri: featured.image }}
          style={s.heroImg}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
        />
        <LinearGradient
          colors={["transparent", COLORS.overlay78]}
          locations={[0.35, 1]}
          style={s.heroG}
        >
          <View />
          <View>
            <Text style={s.heroMeta}>
              {featured.year} · {featured.make}
            </Text>
            <Text style={s.heroModel}>{featured.model}</Text>
            <View style={s.heroBottom}>
              <Text style={s.heroPrice}>
                {formatUsd(featured.price)}
              </Text>
              <ViewerDot count={featured.viewers} />
            </View>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  ),
);
HeroSection.displayName = "HeroSection";

// ── WideCard (full-width editorial card with overlay) ───────────────
const WideCard = React.memo(
  ({
    item,
    onPress,
    height = 220,
  }: {
    item: RegistryListing;
    onPress: () => void;
    height?: number;
  }) => (
    <Pressable
      style={[s.wideCard, { height }]}
      onPress={onPress}
    >
      <Image
        source={{ uri: item.image }}
        style={s.wideCardImg}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE}
        recyclingKey={item.image}
      />
      <LinearGradient
        colors={["transparent", COLORS.overlay78]}
        locations={[0.4, 1]}
        style={s.wideCardG}
      >
        <ViewerDot count={item.viewers} />
        <View>
          <Text style={s.wideCardMeta}>
            {item.year} · {item.make}
          </Text>
          <Text style={s.wideCardModel}>{item.model}</Text>
          <Text style={s.wideCardPrice}>{formatUsd(item.price)}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  ),
);
WideCard.displayName = "WideCard";

// ── GridCard (half-width card with text below) ──────────────────────
const GridCard = React.memo(
  ({
    item,
    onPress,
  }: {
    item: RegistryListing;
    onPress: () => void;
  }) => (
    <Pressable style={s.gridCard} onPress={onPress}>
      <View style={s.gridCardImgWrap}>
        <Image
          source={{ uri: item.image }}
          style={s.gridCardImg}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
          recyclingKey={item.image}
        />
        {item.viewers > 0 && (
          <View style={s.gridCardViewerBadge}>
            <View style={s.gridCardViewerLed} />
            <Text style={s.gridCardViewerText}>{item.viewers}</Text>
          </View>
        )}
        <View style={s.gridCardHeart}>
          <HeartIcon color={COLORS.white} size={25} weight="bold" />
        </View>
      </View>
      <Text style={s.gridCardMeta}>
        {item.year} · {item.make}
      </Text>
      <Text style={s.gridCardModel}>{item.model}</Text>
      <Text style={s.gridCardPrice}>{formatUsd(item.price)}</Text>
    </Pressable>
  ),
);
GridCard.displayName = "GridCard";

// ── Listing Grid ────────────────────────────────────────────────────
export const ListingGridSection = React.memo(
  ({
    title,
    sub,
    items,
    goListing,
    onSeeAll,
  }: {
    title: string;
    sub?: string;
    items: RegistryListing[];
    goListing: (id: string) => void;
    onSeeAll?: () => void;
  }) => (
    <View>
      <SectionHead title={title} sub={sub} onSeeAll={onSeeAll} />
      <FlatList
        data={items.slice(0, 10)}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.gridRailContent}
        ItemSeparatorComponent={() => <View style={s.gridRailGap} />}
        renderItem={({ item }) => (
          <GridCard
            item={item}
            onPress={() => goListing(item.id)}
          />
        )}
      />
    </View>
  ),
);
ListingGridSection.displayName = "ListingGridSection";

// ── Just Listed ──────────────────────────────────────────────────────
export const JustListedSection = React.memo(
  ({
    items,
    goListing,
    onSeeAll,
  }: {
    items: RegistryListing[];
    goListing: (id: string) => void;
    onSeeAll: () => void;
  }) => (
    <View>
      <SectionHead
        title="Just listed"
        sub="Ink's still wet. First looks for members only."
        onSeeAll={onSeeAll}
      />
      {/* Lead hero card */}
      <View style={s.editorialPad}>
        {items[0] && (
          <WideCard
            item={items[0]}
            onPress={() => goListing(items[0].id)}
            height={240}
          />
        )}
      </View>

      {/* Two-column grid pair */}
      <View style={s.gridRow}>
        {items.slice(1, 3).map((item) => (
          <GridCard
            key={item.id}
            item={item}
            onPress={() => goListing(item.id)}
          />
        ))}
      </View>

      {/* Trailing wide card */}
      {items[3] && (
        <View style={s.editorialPad}>
          <WideCard
            item={items[3]}
            onPress={() => goListing(items[3].id)}
          />
        </View>
      )}
    </View>
  ),
);
JustListedSection.displayName = "JustListedSection";

// ── Under $5K ────────────────────────────────────────────────────────
export const Under5kSection = React.memo(
  ({
    items,
    goListing,
    onSeeAll,
  }: {
    items: RegistryListing[];
    goListing: (id: string) => void;
    onSeeAll: () => void;
  }) => (
    <View>
      <SectionHead
        title="Under $5K"
        sub="Serious machines. Reasonable money. No compromises."
        onSeeAll={onSeeAll}
      />
      {/* Lead hero card */}
      <View style={s.editorialPad}>
        {items[0] && (
          <WideCard
            item={items[0]}
            onPress={() => goListing(items[0].id)}
            height={240}
          />
        )}
      </View>

      {/* Two-column grid pair */}
      <View style={s.gridRow}>
        {items.slice(1, 3).map((item) => (
          <GridCard
            key={item.id}
            item={item}
            onPress={() => goListing(item.id)}
          />
        ))}
      </View>
    </View>
  ),
);
Under5kSection.displayName = "Under5kSection";

// ── Rare Finds ───────────────────────────────────────────────────────
export const RareFindsSection = React.memo(
  ({
    items,
    goListing,
  }: {
    items: RegistryListing[];
    goListing: (id: string) => void;
  }) => (
    <View>
      <SectionHead title="Rare finds" sub="The kind you tell stories about finding." />
      <FlatList
        horizontal
        data={items}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={shared.hscroll}
        removeClippedSubviews
        renderItem={({ item }) => (
          <Pressable style={s.rareCard} onPress={() => goListing(item.id)}>
            <Image
              source={{ uri: item.image }}
              style={s.rareImg}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE}
              recyclingKey={item.image}
            />
            <LinearGradient
              colors={["transparent", COLORS.overlay75]}
              locations={[0.35, 1]}
              style={s.rareG}
            >
              <View style={s.rareTop}>
                <View style={s.rareTagWrap}>
                  <Text style={s.rareTag}>RARE</Text>
                </View>
                <ViewerDot count={item.viewers} />
              </View>
              <View>
                <Text style={s.rareName}>
                  {item.year} {item.make} {item.model}
                </Text>
                <Text style={s.rarePrice}>{formatUsd(item.price)}</Text>
              </View>
            </LinearGradient>
          </Pressable>
        )}
      />
    </View>
  ),
);
RareFindsSection.displayName = "RareFindsSection";

// ── Project Bikes ────────────────────────────────────────────────────
export const ProjectBikesSection = React.memo(
  ({
    items,
    goListing,
    onSeeAll,
  }: {
    items: RegistryListing[];
    goListing: (id: string) => void;
    onSeeAll: () => void;
  }) => (
    <View>
      <SectionHead
        title="Project bikes"
        sub="Rough around the edges. Priced for the ambitious."
        onSeeAll={onSeeAll}
      />
      {/* Two-column grid pair */}
      <View style={s.gridRow}>
        {items.slice(0, 2).map((item) => (
          <GridCard
            key={item.id}
            item={item}
            onPress={() => goListing(item.id)}
          />
        ))}
      </View>

      {/* Trailing wide card */}
      {items[2] && (
        <View style={s.editorialPad}>
          <WideCard
            item={items[2]}
            onPress={() => goListing(items[2].id)}
          />
        </View>
      )}
    </View>
  ),
);
ProjectBikesSection.displayName = "ProjectBikesSection";

// ── Builders ──────────────────────────────────────────────────────────
export const ShopsSection = React.memo(
  ({
    shops,
    goShop,
    onSeeAll,
    title = "Builders you might like",
    sub = "Builders and sellers worth following.",
  }: {
    shops: RegistryShop[];
    goShop: (slug: string) => void;
    onSeeAll: () => void;
    title?: string;
    sub?: string;
  }) => (
    <View>
      <SectionHead
        title={title}
        sub={sub}
        onSeeAll={onSeeAll}
      />
      <FlatList
        horizontal
        data={shops}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={shared.hscroll}
        removeClippedSubviews
        renderItem={({ item: shop }) => (
          <Pressable style={s.shopCard} onPress={() => goShop(shop.slug)}>
            <Image
              source={{ uri: shop.image }}
              style={s.shopImg}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE}
              recyclingKey={shop.image}
            />
            <View style={s.shopInfo}>
              <Text style={s.shopName}>{shop.name}</Text>
              <Text style={s.shopSpecialty}>{shop.specialty}</Text>
              <View style={s.shopBottom}>
                <Text style={s.shopBuilds}>{shop.builds} builds</Text>
                <Text style={s.shopArrow}>→</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  ),
);
ShopsSection.displayName = "ShopsSection";

// ── Feature ──────────────────────────────────────────────────────────
export const FeatureSection = React.memo(
  ({
    shop,
    goShop,
  }: {
    shop: RegistryShop;
    goShop: (slug: string) => void;
  }) => (
    <View style={s.featureWrap}>
      <Pressable style={s.feature} onPress={() => goShop(shop.slug)}>
        <Image
          source={{
            uri: shop.image,
          }}
          style={s.featureImg}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
        />
        <LinearGradient
          colors={[COLORS.overlay10, COLORS.overlay85]}
          locations={[0.25, 1]}
          style={s.featureG}
        >
          <View style={s.featureLabelWrap}>
            <Text style={s.featureLabel}>FEATURE</Text>
          </View>
          <View>
            <Text style={s.featureTitle}>{shop.name}</Text>
            <Text style={s.featureQuote}>
              {shop.tagline ?? shop.specialty}
            </Text>
            <View style={s.featureCta}>
              <Text style={s.featureCtaText}>READ THEIR STORY</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  ),
);
FeatureSection.displayName = "FeatureSection";

// ── Sold ──────────────────────────────────────────────────────────────
export const SoldSection = React.memo(
  ({ items }: { items: SoldListing[] }) => (
  <View>
    <SectionHead title="Recently sold" sub="Gone. You hesitated. Don't let the next one slip." />
    <FlatList
      horizontal
      data={items}
      keyExtractor={(_, i) => String(i)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={shared.hscroll}
      removeClippedSubviews
      renderItem={({ item }) => (
        <View style={s.soldCard}>
          <View style={s.soldImgWrap}>
            <Image
              source={{ uri: item.image }}
              style={s.soldImg}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE}
              recyclingKey={item.image}
            />
            <View style={s.soldStamp}>
              <Text style={s.soldStampText}>SOLD</Text>
            </View>
          </View>
          <Text style={s.soldName}>
            {item.make} {item.model}
          </Text>
          <Text style={s.soldPrice}>{formatUsd(item.price)}</Text>
        </View>
      )}
    />
  </View>
));
SoldSection.displayName = "SoldSection";


// ── Section-specific styles ──────────────────────────────────────────
const s = StyleSheet.create({
  // Editorial layout helpers
  editorialPad: { paddingHorizontal: P, marginTop: GRID_GAP },
  gridRow: {
    flexDirection: "row",
    paddingHorizontal: P,
    gap: GRID_GAP,
    marginTop: GRID_GAP,
  },
  gridRailContent: {
    paddingHorizontal: P,
    marginTop: GRID_GAP,
    paddingBottom: 2,
  },
  gridRailGap: {
    width: GRID_GAP,
  },

  // WideCard
  wideCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  wideCardImg: { width: "100%", height: "100%" },
  wideCardG: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 16,
  },
  wideCardMeta: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.whiteA40,
    letterSpacing: 1.2,
    alignSelf: "flex-start",
  },
  wideCardModel: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.white,
    letterSpacing: 0,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  wideCardPrice: {
    fontSize: 14,
    fontFamily: F.monoBold,
    color: COLORS.whiteA70,
    letterSpacing: 0.5,
    marginTop: 4,
    alignSelf: "flex-start",
  },

  // GridCard
  gridCard: { width: GRID_CARD_W },
  gridCardImgWrap: {
    width: GRID_CARD_W,
    height: GRID_CARD_W,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    overflow: "hidden",
  },
  gridCardImg: { width: "100%", height: "100%" },
  gridCardViewerBadge: {
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
  gridCardViewerLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.live,
  },
  gridCardViewerText: {
    fontSize: 9,
    fontFamily: F.monoBold,
    color: COLORS.white,
  },
  gridCardHeart: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.overlay35,
    borderWidth: 1,
    borderColor: COLORS.whiteA50,
  },
  gridCardMeta: {
    fontSize: 13,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    letterSpacing: 0,
    marginTop: 8,
  },
  gridCardModel: {
    fontSize: 16,
    lineHeight: 19,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
    marginTop: 2,
    letterSpacing: 0,
  },
  gridCardPrice: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
    marginTop: 3,
  },

  // Hero
  heroWrap: { marginTop: 14 },
  hero: {
    width: "100%",
    height: 340,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  heroG: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 16,
  },
  heroMeta: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.whiteA40,
    letterSpacing: 1.2,
  },
  heroModel: {
    fontSize: 28,
    fontFamily: F.bold,
    color: COLORS.white,
    letterSpacing: 0,
    lineHeight: 30,
    marginTop: 2,
  },
  heroBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  heroPrice: {
    fontSize: 14,
    fontFamily: F.monoBold,
    color: COLORS.whiteA70,
    letterSpacing: 0.5,
  },

  // Rare
  rareCard: {
    width: 290,
    height: 210,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  rareImg: { width: "100%", height: "100%" },
  rareG: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 14,
  },
  rareTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  rareTagWrap: {
    backgroundColor: COLORS.rare,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  rareTag: {
    fontSize: 8,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.white,
  },
  rareName: { fontSize: 14, fontFamily: F.bold, color: COLORS.white },
  rarePrice: {
    fontSize: 11,
    fontFamily: F.monoMedium,
    color: COLORS.whiteA50,
    marginTop: 2,
  },

  // Shops
  shopCard: { width: 190, backgroundColor: COLORS.black, overflow: "hidden" },
  shopImg: { width: "100%", height: 110, backgroundColor: "#2A2A28" },
  shopInfo: { padding: 12 },
  shopName: { fontSize: 12.5, fontFamily: F.bold, color: COLORS.white },
  shopSpecialty: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.whiteA30,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  shopBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  shopBuilds: {
    fontSize: 9,
    fontFamily: F.monoMedium,
    color: COLORS.whiteA30,
    letterSpacing: 0.5,
  },
  shopArrow: {
    fontSize: 12,
    color: COLORS.whiteA35,
    fontFamily: F.regular,
  },

  // Feature
  featureWrap: { paddingHorizontal: P, marginTop: 44 },
  feature: {
    width: "100%",
    height: 240,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  featureImg: { width: "100%", height: "100%" },
  featureG: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 16,
  },
  featureLabelWrap: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featureLabel: {
    fontSize: 8,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.black,
  },
  featureTitle: {
    fontSize: 20,
    fontFamily: F.bold,
    color: COLORS.white,
    letterSpacing: 0,
  },
  featureQuote: {
    fontSize: 11.5,
    fontFamily: F.regular,
    fontStyle: "italic",
    color: COLORS.whiteA50,
    lineHeight: 17,
    marginTop: 5,
    maxWidth: 260,
  },
  featureCta: {
    alignSelf: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.whiteA25,
    marginTop: 10,
    paddingBottom: 1,
  },
  featureCtaText: {
    fontSize: 9,
    fontFamily: F.monoMedium,
    letterSpacing: 1.2,
    color: COLORS.white,
  },

  // Sold
  soldCard: { width: 132 },
  soldImgWrap: {
    width: 132,
    height: 132,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  soldImg: { width: "100%", height: "100%", opacity: 0.3 },
  soldStamp: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -22 }, { translateY: -10 }, { rotate: "-12deg" }],
  },
  soldStampText: {
    fontSize: 14,
    fontFamily: F.bold,
    letterSpacing: 4,
    color: COLORS.sold,
  },
  soldName: {
    fontSize: 11.5,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  soldPrice: {
    fontSize: 10,
    fontFamily: F.mono,
    color: COLORS.textMuted,
    marginTop: 2,
  },

});
