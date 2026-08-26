/**
 * Shared registry UI components
 * Used across multiple registry sections
 */
import { CATEGORIES } from "@/components/icons/CategoryIcons";
import { BORDERS, COLORS, F, IMAGE_CACHE, IMAGE_PLACEHOLDER, SPACING } from "@/constants/design";
import { Image } from "expo-image";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

// ── ViewerDot ────────────────────────────────────────────────────────
export const ViewerDot = React.memo(({ count }: { count: number }) => {
  if (!count) return null;
  return (
    <View style={s.viewerDot}>
      <View style={s.viewerDotLed} />
      <Text style={s.viewerDotText}>{count}</Text>
    </View>
  );
});

// ── HamburgerIcon ────────────────────────────────────────────────────
export function HamburgerIcon() {
  return (
    <View style={s.hamburger}>
      <View style={s.hamburgerLine} />
      <View style={[s.hamburgerLine, s.hamburgerLineShort]} />
    </View>
  );
}

// ── SectionHead ──────────────────────────────────────────────────────
export const SectionHead = React.memo(
  ({
    title,
    sub,
    onSeeAll,
  }: {
    title: string;
    sub?: string;
    onSeeAll?: () => void;
  }) => (
    <View style={s.secHead}>
      <View style={{ flex: 1 }}>
        <Text style={s.secTitle}>{title}</Text>
        {sub && <Text style={s.secSub}>{sub}</Text>}
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={12}>
          <Text style={s.seeAll}>SEE ALL</Text>
        </Pressable>
      )}
    </View>
  ),
);

// ── HCard (horizontal listing card) ──────────────────────────────────
export const HCard = React.memo(
  ({ make, model, price, year, image, viewers, onPress }: any) => (
    <Pressable style={s.hcard} onPress={onPress}>
      <View style={s.hcardImgWrap}>
        <Image
          source={{ uri: image }}
          style={s.hcardImg}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
          placeholder={IMAGE_PLACEHOLDER}
          recyclingKey={image}
        />
        {viewers > 0 && (
          <View style={s.hcardViewerBadge}>
            <View style={s.hcardViewerLed} />
            <Text style={s.hcardViewerText}>{viewers}</Text>
          </View>
        )}
      </View>
      <Text style={s.hcardMeta}>
        {year} · {make}
      </Text>
      <Text style={s.hcardModel}>{model}</Text>
      <Text style={s.hcardPrice}>${price.toLocaleString()}</Text>
    </Pressable>
  ),
);

// ── CategoryBar ──────────────────────────────────────────────────────
export const CategoryBar = React.memo(
  ({ cat, setCat }: { cat: string; setCat: (k: string) => void }) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.catBar}
    >
      {CATEGORIES.map((c) => {
        const on = cat === c.key;
        return (
          <Pressable
            key={c.key}
            style={s.catItem}
            onPress={() => setCat(c.key)}
          >
            <View style={[s.catIconWrap, on && s.catIconWrapOn]}>
              <c.Icon
                color={on ? COLORS.black : COLORS.textFaint}
                active={on}
              />
            </View>
            <Text style={[s.catLabel, on && s.catLabelOn]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  ),
);

// ── Styles ────────────────────────────────────────────────────────────
const P = SPACING.page;
export const s = StyleSheet.create({
  // Viewer dot
  viewerDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.overlay50,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  viewerDotLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.live,
  },
  viewerDotText: { fontSize: 9, fontFamily: F.monoBold, color: COLORS.white },

  // Hamburger
  hamburger: { width: 20, height: 14, justifyContent: "space-between" },
  hamburgerLine: { width: 20, height: 2, backgroundColor: COLORS.textPrimary },
  hamburgerLineShort: { width: 14 },

  // Section head
  secHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: P,
    marginTop: 44,
    marginBottom: 12,
  },
  secTitle: {
    fontSize: 18,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  secSub: {
    fontSize: 11,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  seeAll: {
    fontSize: 9,
    fontFamily: F.monoMedium,
    letterSpacing: 1,
    color: COLORS.textMuted,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 1,
    marginTop: 4,
  },

  // HCard
  hcard: { width: 172 },
  hcardImgWrap: {
    width: 172,
    height: 228,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  hcardImg: { width: "100%", height: "100%" },
  hcardViewerBadge: {
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
  hcardViewerLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.live,
  },
  hcardViewerText: { fontSize: 9, fontFamily: F.monoBold, color: COLORS.white },
  hcardMeta: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.textFaint,
    letterSpacing: 1,
    marginTop: 8,
  },
  hcardModel: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 1,
    letterSpacing: -0.3,
  },
  hcardPrice: {
    fontSize: 13,
    fontFamily: F.monoBold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },

  // Horizontal scroll
  hscroll: { paddingHorizontal: P, gap: 12 },

  // Category bar
  catBar: { paddingHorizontal: P, gap: 14, paddingBottom: 12 },
  catItem: { alignItems: "center", width: 56 },
  catIconWrap: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  catIconWrapOn: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.black,
  },
  catLabel: {
    fontSize: 8,
    fontFamily: F.monoMedium,
    letterSpacing: 0.8,
    color: COLORS.textFaint,
    textAlign: "center",
  },
  catLabelOn: { color: COLORS.textPrimary, fontFamily: F.monoBold },
});
