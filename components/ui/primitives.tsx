/**
 * CROIGSLIST UI PRIMITIVES
 *
 * Composable building blocks built on the design system.
 * Import these instead of writing raw StyleSheet for common patterns.
 *
 * Usage:
 *   import { Row, Label, Chip, PageHeader, Divider } from '@/components/ui/primitives';
 */

import { BORDERS, COLORS, F, SPACING, TYPE } from "@/constants/design";
import { ReactNode } from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

// ── Layout ───────────────────────────────────────────────────────────

/** Horizontal flex row with configurable gap and alignment */
export function Row({
  children,
  gap = SPACING.sm,
  align = "center",
  wrap = false,
  style,
}: {
  children: ReactNode;
  gap?: number;
  align?: ViewStyle["alignItems"];
  wrap?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: align,
          gap,
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Vertical flex column with configurable gap */
export function Stack({
  children,
  gap = 0,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: ViewStyle;
}) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

/** Page-level horizontal padding wrapper */
export function PagePad({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ paddingHorizontal: SPACING.page }, style]}>{children}</View>
  );
}

// ── Typography ───────────────────────────────────────────────────────

/** Large page title — 42pt bold */
export function PageTitle({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  return (
    <Text
      style={[
        TYPE.pageTitle,
        { fontSize: 42, letterSpacing: -1, lineHeight: 44 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Section header — 18pt semibold */
export function SectionHeader({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  return <Text style={[TYPE.sectionHeader, style]}>{children}</Text>;
}

/** Mono label — 9pt uppercase tracking */
export function Label({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  return <Text style={[TYPE.label, style]}>{children}</Text>;
}

/** Bold mono label — 9pt uppercase, primary color */
export function LabelBold({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  return <Text style={[TYPE.labelBold, style]}>{children}</Text>;
}

/** Body text — 15pt regular */
export function Body({
  children,
  numberOfLines,
  style,
}: {
  children: string;
  numberOfLines?: number;
  style?: TextStyle;
}) {
  return (
    <Text style={[TYPE.body, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/** Small body text — 13pt secondary */
export function BodySmall({
  children,
  numberOfLines,
  style,
}: {
  children: string;
  numberOfLines?: number;
  style?: TextStyle;
}) {
  return (
    <Text style={[TYPE.bodySmall, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/** Mono text — 12pt */
export function Mono({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  return <Text style={[TYPE.mono, style]}>{children}</Text>;
}

/** Small mono — 10pt muted */
export function MonoSmall({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  return <Text style={[TYPE.monoSmall, style]}>{children}</Text>;
}

/** Card title — 14pt bold */
export function CardTitle({
  children,
  numberOfLines,
  style,
}: {
  children: string;
  numberOfLines?: number;
  style?: TextStyle;
}) {
  return (
    <Text style={[TYPE.cardTitle, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/** Card meta — 9pt mono faint */
export function CardMeta({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  return <Text style={[TYPE.cardMeta, style]}>{children}</Text>;
}

/** Card price — 11.5pt mono medium */
export function CardPrice({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  return <Text style={[TYPE.cardPrice, style]}>{children}</Text>;
}

// ── Components ───────────────────────────────────────────────────────

/** Bordered chip / tag — square, thin border */
export function Chip({
  children,
  style,
}: {
  children: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.chip, style]}>
      <Text style={styles.chipText}>{children}</Text>
    </View>
  );
}

/** Accent badge — acid green background, black text */
export function AccentBadge({
  children,
  style,
}: {
  children: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.accentBadge, style]}>
      <Text style={styles.accentBadgeText}>{children}</Text>
    </View>
  );
}

/** Thin horizontal divider */
export function Divider({ style }: { style?: ViewStyle } = {}) {
  return <View style={[styles.divider, style]} />;
}

/** Page header block — title + optional subtitle, with page padding */
export function PageHeader({
  title,
  subtitle,
  style,
}: {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        { paddingHorizontal: SPACING.page, paddingTop: SPACING.xl },
        style,
      ]}
    >
      <PageTitle>{title}</PageTitle>
      {subtitle && (
        <BodySmall style={{ marginTop: SPACING.sm, maxWidth: 300 }}>
          {subtitle}
        </BodySmall>
      )}
    </View>
  );
}

/** Empty state block */
export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.emptyState}>
      <Label>{title}</Label>
      <BodySmall style={{ marginTop: SPACING.sm, maxWidth: 280 }}>
        {body}
      </BodySmall>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  chip: {
    ...BORDERS.thin,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 8,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
  },
  accentBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  accentBadgeText: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 1,
    color: COLORS.black,
  },
  divider: {
    height: 0.5,
    backgroundColor: COLORS.divider,
  },
  emptyState: {
    borderTopWidth: 0.5,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.lg,
  },
});
