/**
 * CROIGSLIST DESIGN SYSTEM
 *
 * White-first mobile marketplace UI. Bold black type, simple dividers,
 * pill CTAs, rounded fields, and product imagery doing most of the work.
 *
 * Every screen imports from here. No hardcoded values.
 */

// ═══════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════
export const COLORS = {
  white: "#FFFFFF",
  black: "#242424",
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceRaised: "#F7F7F7",

  gray100: "#F4F4F4",
  gray200: "#E7E7E7",
  gray300: "#C9C9C9",
  gray400: "#8D8D8D",
  gray500: "#737373",
  gray600: "#525252",
  gray700: "#3A3A3A",
  gray800: "#2E2E2E",
  gray900: "#242424",

  accent: "#E4002B",
  accentAlt: "#168A0F",

  verified: "#168A0F",
  rare: "#E4002B",
  sold: "#E4002B",
  active: "#168A0F",
  live: "#E4002B",

  error: "#C82A2A",
  success: "#168A0F",
  warning: "#EAB308",

  textPrimary: "#242424",
  textSecondary: "#333333",
  textMuted: "#747474",
  textFaint: "#AFAFAF",

  divider: "#E5E5E5",
  dividerLight: "#F0F0F0",

  // Overlays — black (#1A1A18) at opacity
  overlay10: "rgba(36,36,36,0.1)",
  overlay35: "rgba(36,36,36,0.35)",
  overlay50: "rgba(36,36,36,0.5)",
  overlay75: "rgba(36,36,36,0.75)",
  overlay78: "rgba(36,36,36,0.78)",
  overlay85: "rgba(36,36,36,0.85)",
  overlay90: "rgba(36,36,36,0.9)",

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
    fontSize: 36,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  sectionHeader: {
    fontSize: 22,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  sectionSub: {
    fontSize: 11,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  cardMeta: {
    fontSize: 14,
    fontFamily: F.semibold,
    letterSpacing: 0,
    color: COLORS.textMuted,
  },
  cardPrice: {
    fontSize: 18,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  price: {
    fontSize: 26,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 17,
    fontFamily: F.regular,
    lineHeight: 25,
    color: COLORS.textPrimary,
  },
  bodySmall: {
    fontSize: 15,
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
    fontSize: 13,
    fontFamily: F.semibold,
    letterSpacing: 0,
    color: COLORS.textMuted,
  },
  labelBold: {
    fontSize: 14,
    fontFamily: F.bold,
    letterSpacing: 0,
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
  page: 28,
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
