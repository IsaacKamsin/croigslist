/**
 * Registry section components
 * Each section is isolated and memo'd for scroll performance
 */
import { COLORS, F, IMAGE_CACHE, IMAGE_PLACEHOLDER, SPACING } from "@/constants/design";
import {
  FEATURED,
  JUST_LISTED,
  PROJECT_BIKES,
  RARE_FINDS,
  SHOPS,
  SOLD,
  UNDER_5K,
} from "@/data/registry";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { HCard, SectionHead, ViewerDot, s as shared } from "./shared";

const P = SPACING.page;
const SCREEN_W = Dimensions.get("window").width;
const GRID_GAP = 12;
const GRID_CARD_W = (SCREEN_W - P * 2 - GRID_GAP) / 2;

// ── Hero ─────────────────────────────────────────────────────────────
export const HeroSection = React.memo(
  ({ onPress }: { onPress: () => void }) => (
    <Pressable style={s.heroWrap} onPress={onPress}>
      <View style={s.hero}>
        <Image
          source={{ uri: FEATURED.image }}
          style={s.heroImg}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
          placeholder={IMAGE_PLACEHOLDER}
        />
        <LinearGradient
          colors={["transparent", COLORS.overlay78]}
          locations={[0.35, 1]}
          style={s.heroG}
        >
          <View />
          <View>
            <Text style={s.heroMeta}>
              {FEATURED.year} · {FEATURED.make}
            </Text>
            <Text style={s.heroModel}>{FEATURED.model}</Text>
            <View style={s.heroBottom}>
              <Text style={s.heroPrice}>
                ${FEATURED.price.toLocaleString()}
              </Text>
              <ViewerDot count={FEATURED.viewers} />
            </View>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  ),
);

// ── WideCard (full-width editorial card with overlay) ───────────────
const WideCard = React.memo(
  ({
    item,
    onPress,
    height = 220,
  }: {
    item: (typeof JUST_LISTED)[0];
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
          <Text style={s.wideCardPrice}>${item.price.toLocaleString()}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  ),
);

// ── GridCard (half-width card with text below) ──────────────────────
const GridCard = React.memo(
  ({
    item,
    onPress,
  }: {
    item: (typeof JUST_LISTED)[0];
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
      </View>
      <Text style={s.gridCardMeta}>
        {item.year} · {item.make}
      </Text>
      <Text style={s.gridCardModel}>{item.model}</Text>
      <Text style={s.gridCardPrice}>${item.price.toLocaleString()}</Text>
    </Pressable>
  ),
);

// ── Just Listed ──────────────────────────────────────────────────────
export const JustListedSection = React.memo(
  ({
    goListing,
    onSeeAll,
  }: {
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
        {JUST_LISTED[0] && (
          <WideCard
            item={JUST_LISTED[0]}
            onPress={() => goListing(JUST_LISTED[0].id)}
            height={240}
          />
        )}
      </View>

      {/* Two-column grid pair */}
      <View style={s.gridRow}>
        {JUST_LISTED.slice(1, 3).map((item) => (
          <GridCard
            key={item.id}
            item={item}
            onPress={() => goListing(item.id)}
          />
        ))}
      </View>

      {/* Trailing wide card */}
      {JUST_LISTED[3] && (
        <View style={s.editorialPad}>
          <WideCard
            item={JUST_LISTED[3]}
            onPress={() => goListing(JUST_LISTED[3].id)}
          />
        </View>
      )}
    </View>
  ),
);

// ── Under $5K ────────────────────────────────────────────────────────
export const Under5kSection = React.memo(
  ({
    goListing,
    onSeeAll,
  }: {
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
        {UNDER_5K[0] && (
          <WideCard
            item={UNDER_5K[0]}
            onPress={() => goListing(UNDER_5K[0].id)}
            height={240}
          />
        )}
      </View>

      {/* Two-column grid pair */}
      <View style={s.gridRow}>
        {UNDER_5K.slice(1, 3).map((item) => (
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

// ── Rare Finds ───────────────────────────────────────────────────────
export const RareFindsSection = React.memo(
  ({ goListing }: { goListing: (id: string) => void }) => (
    <View>
      <SectionHead title="Rare finds" sub="The kind you tell stories about finding." />
      <FlatList
        horizontal
        data={RARE_FINDS}
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
                <Text style={s.rarePrice}>${item.price.toLocaleString()}</Text>
              </View>
            </LinearGradient>
          </Pressable>
        )}
      />
    </View>
  ),
);

// ── Project Bikes ────────────────────────────────────────────────────
export const ProjectBikesSection = React.memo(
  ({
    goListing,
    onSeeAll,
  }: {
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
        {PROJECT_BIKES.slice(0, 2).map((item) => (
          <GridCard
            key={item.id}
            item={item}
            onPress={() => goListing(item.id)}
          />
        ))}
      </View>

      {/* Trailing wide card */}
      {PROJECT_BIKES[2] && (
        <View style={s.editorialPad}>
          <WideCard
            item={PROJECT_BIKES[2]}
            onPress={() => goListing(PROJECT_BIKES[2].id)}
          />
        </View>
      )}
    </View>
  ),
);

// ── Shops ─────────────────────────────────────────────────────────────
export const ShopsSection = React.memo(
  ({
    goShop,
    onSeeAll,
  }: {
    goShop: (slug: string) => void;
    onSeeAll: () => void;
  }) => (
    <View>
      <SectionHead
        title="Minneapolis shops"
        sub="The hands behind the machines. Vetted, trusted, local."
        onSeeAll={onSeeAll}
      />
      <FlatList
        horizontal
        data={SHOPS}
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

// ── Feature ──────────────────────────────────────────────────────────
export const FeatureSection = React.memo(
  ({ goBuilder }: { goBuilder: (id: string) => void }) => (
    <View style={s.featureWrap}>
      <Pressable style={s.feature} onPress={() => goBuilder("u2")}>
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=80",
          }}
          style={s.featureImg}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
          placeholder={IMAGE_PLACEHOLDER}
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
            <Text style={s.featureTitle}>Twin Cities Moto Co.</Text>
            <Text style={s.featureQuote}>
              "Every machine that leaves this shop runs like the day it rolled
              off the line."
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

// ── Sold ──────────────────────────────────────────────────────────────
export const SoldSection = React.memo(() => (
  <View>
    <SectionHead title="Recently sold" sub="Gone. You hesitated. Don't let the next one slip." />
    <FlatList
      horizontal
      data={SOLD}
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
          <Text style={s.soldPrice}>${item.price.toLocaleString()}</Text>
        </View>
      )}
    />
  </View>
));


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
    letterSpacing: -0.5,
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
    height: GRID_CARD_W * 1.3,
    backgroundColor: COLORS.surface,
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
  gridCardMeta: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.textFaint,
    letterSpacing: 1,
    marginTop: 8,
  },
  gridCardModel: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 1,
    letterSpacing: -0.3,
  },
  gridCardPrice: {
    fontSize: 13,
    fontFamily: F.monoBold,
    color: COLORS.textPrimary,
    marginTop: 4,
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
    letterSpacing: -0.8,
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
    letterSpacing: -0.3,
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
