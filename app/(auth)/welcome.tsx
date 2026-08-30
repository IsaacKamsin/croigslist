import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const HERO_IMAGE = require("../../assets/images/login/IMG_5142-hero.jpg");

// ── Main Screen ──────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.card}>
          <Text style={styles.title}>Start selling{"\n"}on Croigslist</Text>
          <Text style={styles.subtitle}>
            Sell builds, parts, and projects from your garage.
          </Text>
          <Text style={styles.subtitle}>
            Free to list. Add a few details and publish when ready.
          </Text>
          <Text style={styles.terms}>
            By continuing you agree to the Croigslist terms.
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
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.page,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 24,
  },
  title: {
    fontSize: 38,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
    lineHeight: 41,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginTop: 18,
  },
  terms: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: COLORS.black,
    borderRadius: 32,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: { fontSize: 16, fontFamily: F.bold, color: COLORS.white },
  secondaryButton: {
    alignItems: "center",
    paddingTop: 22,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
});
