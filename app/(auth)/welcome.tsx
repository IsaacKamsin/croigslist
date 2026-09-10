import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const HERO_IMAGE = require("../../assets/images/login/IMG_5142-hero.jpg");

// ── Main Screen ──────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cardHeight, setCardHeight] = useState(0);
  const cardBottom = insets.bottom + 16;

  return (
    <View style={styles.container}>
      <Image
        source={HERO_IMAGE}
        style={styles.bgMedia}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE}
        priority="high"
      />

      <LinearGradient
        colors={[COLORS.blackA10, COLORS.blackA85]}
        locations={[0.3, 0.85]}
        style={styles.gradient}
      />

      {cardHeight > 0 ? (
        <View style={[styles.riderTag, { bottom: cardBottom + cardHeight + 10 }]}>
          <Text style={styles.riderText}>@brokendrapper  ·  Duluth, MN</Text>
        </View>
      ) : null}

      <View style={[styles.bottom, { paddingBottom: cardBottom }]}>
        <View
          style={styles.card}
          onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        >
          <Text style={styles.title}>Start selling on Croigslist</Text>
          <Text style={styles.subtitle}>
            List bikes and builds from your garage. Membership is
            free for 3 days, then $100/year.
          </Text>
          <Text style={styles.terms}>
            By continuing you agree to the Croigslist terms and annual billing
            after your trial.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace("/(auth)/apply")}
          >
            <Text style={styles.primaryButtonText}>Start selling</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  bgMedia: { ...StyleSheet.absoluteFillObject, width, height },
  gradient: { ...StyleSheet.absoluteFillObject },
  riderTag: {
    position: "absolute",
    left: SPACING.page,
    zIndex: 2,
    backgroundColor: "rgba(36,36,36,0.34)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  riderText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: F.mono,
    color: COLORS.whiteA70,
    letterSpacing: 0.8,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.page,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
  },
  title: {
    fontSize: 29,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: 12,
  },
  terms: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 18,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.black,
    borderRadius: 26,
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: { fontSize: 15, fontFamily: F.bold, color: COLORS.white },
  secondaryButton: {
    alignItems: "center",
    paddingTop: 18,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
});
