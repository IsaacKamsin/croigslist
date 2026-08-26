/**
 * CROIGSLIST DESIGN SYSTEM — "Registry Modern"
 *
 * Cream-first. Industrial. Mechanical. No softness.
 * Space Grotesk (primary) + IBM Plex Mono (registry layer).
 * Acid green (#BFFF00) as signal color.
 *
 * Every screen imports from here. No hardcoded values.
 */

// ═══════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════
export const COLORS = {
  white: "#FFFFFF",
  black: "#1A1A18",
  bg: "#F6F3ED",
  surface: "#EDEAE3",
  surfaceRaised: "#E5E2DA",

  gray100: "#E0DDD5",
  gray200: "#D0CCC4",
  gray300: "#B8B4AA",
  gray400: "#8A8A80",
  gray500: "#6A6A60",
  gray600: "#4A4A44",
  gray700: "#3A3A34",
  gray800: "#2A2A24",
  gray900: "#1A1A18",

  accent: "#BFFF00",
  accentAlt: "#C44A2F",

  verified: "#BFFF00",
  rare: "#C44A2F",
  sold: "#C44A2F",
  active: "#BFFF00",
  live: "#BFFF00",

  error: "#C44A2F",
  success: "#2D6A4F",
  warning: "#EAB308",

  textPrimary: "#1A1A18",
  textSecondary: "#4A4A44",
  textMuted: "#8A8A80",
  textFaint: "#B8B4AA",

  divider: "#E0DDD5",
  dividerLight: "#EDEAE3",

  // Overlays — black (#1A1A18) at opacity
  overlay10: "rgba(26,26,24,0.1)",
  overlay35: "rgba(26,26,24,0.35)",
  overlay50: "rgba(26,26,24,0.5)",
  overlay75: "rgba(26,26,24,0.75)",
  overlay78: "rgba(26,26,24,0.78)",
  overlay85: "rgba(26,26,24,0.85)",
  overlay90: "rgba(26,26,24,0.9)",

  // White at opacity — for text/borders on dark backgrounds
  whiteA25: "rgba(255,255,255,0.25)",
  whiteA30: "rgba(255,255,255,0.3)",
  whiteA35: "rgba(255,255,255,0.35)",
  whiteA40: "rgba(255,255,255,0.4)",
  whiteA50: "rgba(255,255,255,0.5)",
  whiteA60: "rgba(255,255,255,0.6)",
  whiteA70: "rgba(255,255,255,0.7)",

  // Pure black overlays — for gradients on images
  blackA10: "rgba(0,0,0,0.1)",
  blackA45: "rgba(0,0,0,0.45)",
  blackA85: "rgba(0,0,0,0.85)",
} as const;

// ═══════════════════════════════════════════
// FONTS — family strings match assets/fonts/*.ttf
// ═══════════════════════════════════════════
export const FONTS = {
  primary: {
    bold: "SpaceGrotesk-Bold",
    semiBold: "SpaceGrotesk-SemiBold",
    medium: "SpaceGrotesk-Medium",
    regular: "SpaceGrotesk-Regular",
    light: "SpaceGrotesk-Light",
  },
  mono: {
    bold: "IBMPlexMono-Bold",
    semiBold: "IBMPlexMono-SemiBold",
    medium: "IBMPlexMono-Medium",
    regular: "IBMPlexMono-Regular",
  },
} as const;

// Flat alias for quick access in StyleSheet
export const F = {
  bold: FONTS.primary.bold,
  semibold: FONTS.primary.semiBold,
  medium: FONTS.primary.medium,
  regular: FONTS.primary.regular,
  light: FONTS.primary.light,
  monoBold: FONTS.mono.bold,
  monoSemiBold: FONTS.mono.semiBold,
  monoMedium: FONTS.mono.medium,
  mono: FONTS.mono.regular,
} as const;

// ═══════════════════════════════════════════
// TYPE PRESETS
// ═══════════════════════════════════════════
export const TYPE = {
  pageTitle: {
    fontSize: 28,
    fontFamily: F.bold,
    letterSpacing: -0.5,
    color: COLORS.textPrimary,
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: F.semibold,
    letterSpacing: -0.3,
    color: COLORS.textPrimary,
  },
  sectionSub: {
    fontSize: 11,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: F.bold,
    letterSpacing: -0.2,
    color: COLORS.textPrimary,
  },
  cardMeta: {
    fontSize: 10,
    fontFamily: F.mono,
    letterSpacing: 1,
    color: COLORS.textFaint,
  },
  cardPrice: {
    fontSize: 11.5,
    fontFamily: F.monoMedium,
    color: COLORS.textSecondary,
  },
  price: {
    fontSize: 20,
    fontFamily: F.bold,
    letterSpacing: -0.5,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 15,
    fontFamily: F.regular,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  bodySmall: {
    fontSize: 13,
    fontFamily: F.regular,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  mono: {
    fontSize: 12,
    fontFamily: F.mono,
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
  },
  monoSmall: {
    fontSize: 10,
    fontFamily: F.mono,
    letterSpacing: 0.5,
    color: COLORS.textMuted,
  },
  label: {
    fontSize: 10,
    fontFamily: F.monoMedium,
    letterSpacing: 1,
    color: COLORS.textMuted,
  },
  labelBold: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.textPrimary,
  },
  tag: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.white,
  },
  nav: {
    fontSize: 13,
    fontFamily: F.monoMedium,
    letterSpacing: 0.8,
    color: COLORS.textPrimary,
  },
} as const;

// ═══════════════════════════════════════════
// SPACING
// ═══════════════════════════════════════════
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  page: 24, // horizontal page padding
} as const;

// ═══════════════════════════════════════════
// BORDERS
// ═══════════════════════════════════════════
export const BORDERS = {
  hairline: {
    borderWidth: 0.5,
    borderColor: COLORS.divider,
  },
  thin: {
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  active: {
    borderWidth: 2,
    borderColor: COLORS.black,
  },
} as const;

// ═══════════════════════════════════════════
// IMAGE
// ═══════════════════════════════════════════
export const IMAGE_CACHE = "memory-disk" as const;

/** Placeholder blurhash — neutral warm gray, matches COLORS.surface */
export const IMAGE_PLACEHOLDER = { blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" };
