/**
 * SHARED STYLE PRESETS
 *
 * Extracted from repeated patterns across screens.
 * Import and spread into your local StyleSheet.create.
 *
 * Usage:
 *   import { S } from '@/constants/styles';
 *   const styles = StyleSheet.create({
 *     container: S.screenContainer,
 *     header:    S.screenHeader,
 *     title:     S.screenTitle,
 *     divider:   S.divider,
 *     button:    S.primaryButton,
 *   });
 */

import { COLORS, F, SPACING, TYPE } from "@/constants/design";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

// ── Screen scaffolding ──────────────────────────────────────────────

/** flex: 1, backgroundColor: COLORS.bg */
export const screenContainer: ViewStyle = {
  flex: 1,
  backgroundColor: COLORS.bg,
};

/** Standard tab-screen header padding */
export const screenHeader: ViewStyle = {
  paddingHorizontal: SPACING.page,
  paddingTop: SPACING.md,
  paddingBottom: SPACING.md,
};

/** Bold uppercase title with letter-spacing */
export const screenTitle: TextStyle = {
  fontSize: 20,
  fontFamily: F.bold,
  letterSpacing: 4,
  color: COLORS.textPrimary,
};

// ── Dividers ────────────────────────────────────────────────────────

/** 0.5px hairline divider */
export const divider: ViewStyle = {
  height: 0.5,
  backgroundColor: COLORS.divider,
};

/** Divider inset to page padding */
export const dividerInset: ViewStyle = {
  ...divider,
  marginHorizontal: SPACING.page,
};

// ── Buttons ─────────────────────────────────────────────────────────

/** Full-width black CTA */
export const primaryButton: ViewStyle = {
  backgroundColor: COLORS.black,
  minHeight: 64,
  borderRadius: 32,
  paddingVertical: 18,
  paddingHorizontal: SPACING.lg,
  alignItems: "center",
  justifyContent: "center",
};

/** White text for primary button */
export const primaryButtonText: TextStyle = {
  color: COLORS.white,
  fontSize: 18,
  fontFamily: F.bold,
  letterSpacing: 0,
};

/** White outlined CTA */
export const secondaryButton: ViewStyle = {
  minHeight: 64,
  borderRadius: 32,
  borderWidth: 2,
  borderColor: COLORS.black,
  paddingVertical: 18,
  paddingHorizontal: SPACING.lg,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: COLORS.white,
};

export const secondaryButtonText: TextStyle = {
  color: COLORS.black,
  fontSize: 18,
  fontFamily: F.bold,
  letterSpacing: 0,
};

/** Disabled state — apply alongside primaryButton */
export const buttonDisabled: ViewStyle = {
  opacity: 0.4,
};

// ── Form inputs ─────────────────────────────────────────────────────

/** Rounded marketplace text input */
export const input: TextStyle = {
  borderWidth: 1.5,
  borderColor: COLORS.gray300,
  borderRadius: 10,
  paddingHorizontal: 18,
  paddingVertical: 16,
  fontSize: 18,
  fontFamily: F.regular,
  color: COLORS.textPrimary,
};

/** Multi-line text area */
export const textArea: TextStyle = {
  minHeight: 124,
  paddingTop: 16,
};

/** Form section label */
export const formLabel: TextStyle = {
  ...TYPE.sectionHeader,
  fontSize: 18,
  marginBottom: 10,
  marginTop: SPACING.lg,
};

// ── Cards / images ──────────────────────────────────────────────────

/** Card image — fills its wrapper */
export const cardImage: ImageStyle = {
  width: "100%",
  height: "100%",
};

/** Card metadata text block */
export const cardMeta: TextStyle = {
  ...TYPE.cardMeta,
};

export const cardTitle: TextStyle = {
  ...TYPE.cardTitle,
  marginTop: 2,
};

export const cardPrice: TextStyle = {
  ...TYPE.cardPrice,
  marginTop: 4,
};

// ── Viewer badge ────────────────────────────────────────────────────

export const viewerBadge: ViewStyle = {
  position: "absolute",
  top: 6,
  right: 6,
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: "rgba(26,26,24,0.5)",
  paddingHorizontal: 6,
  paddingVertical: 2,
};

export const viewerLed: ViewStyle = {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: COLORS.live,
};

export const viewerText: TextStyle = {
  fontSize: 8,
  fontFamily: F.monoBold,
  color: COLORS.white,
};

// ── Verified badge ──────────────────────────────────────────────────

export const verifiedBadge: ViewStyle = {
  backgroundColor: COLORS.accent,
  paddingHorizontal: 6,
  paddingVertical: 2,
};

export const verifiedText: TextStyle = {
  fontSize: 8,
  fontFamily: F.monoBold,
  letterSpacing: 1.5,
  color: COLORS.black,
};

// ── Avatar ──────────────────────────────────────────────────────────

/** Base avatar container — override width/height per screen */
export const avatarBase: ViewStyle = {
  backgroundColor: COLORS.gray400,
  borderRadius: 999,
  justifyContent: "center",
  alignItems: "center",
};

export const avatarText: TextStyle = {
  fontFamily: F.bold,
  color: COLORS.white,
};

// ── Empty state ─────────────────────────────────────────────────────

export const emptyContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingBottom: 80,
};

export const emptyTitle: TextStyle = {
  ...TYPE.label,
  letterSpacing: 3,
};

export const emptyBody: TextStyle = {
  ...TYPE.bodySmall,
  marginTop: SPACING.sm,
  textAlign: "center",
};

// ── Menu / nav rows ─────────────────────────────────────────────────

export const menuRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: SPACING.md,
  borderBottomWidth: 0.5,
  borderBottomColor: COLORS.divider,
};

export const menuLabel: TextStyle = {
  ...TYPE.mono,
  fontFamily: F.monoBold,
  letterSpacing: 2,
  color: COLORS.textPrimary,
};

export const menuArrow: TextStyle = {
  fontSize: 14,
  fontFamily: F.regular,
  color: COLORS.textFaint,
};

// ── Filter chips ────────────────────────────────────────────────────

export const filterChip: ViewStyle = {
  borderWidth: 1.5,
  borderColor: COLORS.gray300,
  borderRadius: 24,
  paddingHorizontal: 18,
  paddingVertical: 12,
};

export const filterChipActive: ViewStyle = {
  borderColor: COLORS.black,
  backgroundColor: COLORS.black,
};

export const filterChipText: TextStyle = {
  fontSize: 16,
  fontFamily: F.semibold,
  letterSpacing: 0,
  color: COLORS.textSecondary,
};

export const filterChipTextActive: TextStyle = {
  color: COLORS.white,
};

// ── Section ─────────────────────────────────────────────────────────

export const section: ViewStyle = {
  paddingHorizontal: SPACING.page,
  paddingVertical: SPACING.lg,
};

export const sectionTitle: TextStyle = {
  ...TYPE.sectionHeader,
  marginBottom: SPACING.md,
};

// ── Actions footer ──────────────────────────────────────────────────

export const actionsFooter: ViewStyle = {
  paddingHorizontal: SPACING.page,
  paddingTop: SPACING.md,
  paddingBottom: SPACING.xxl + 20,
};

// ── Barrel export ───────────────────────────────────────────────────

export const S = {
  screenContainer,
  screenHeader,
  screenTitle,
  divider,
  dividerInset,
  primaryButton,
  primaryButtonText,
  buttonDisabled,
  input,
  textArea,
  formLabel,
  cardImage,
  cardMeta,
  cardTitle,
  cardPrice,
  viewerBadge,
  viewerLed,
  viewerText,
  verifiedBadge,
  verifiedText,
  avatarBase,
  avatarText,
  emptyContainer,
  emptyTitle,
  emptyBody,
  menuRow,
  menuLabel,
  menuArrow,
  filterChip,
  filterChipActive,
  filterChipText,
  filterChipTextActive,
  section,
  sectionTitle,
  actionsFooter,
  secondaryButton,
  secondaryButtonText,
} as const;
