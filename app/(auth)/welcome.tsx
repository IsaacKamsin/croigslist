import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const HERO_IMAGE = require("../../assets/images/login/IMG_5142-hero.jpg");
const HERO_VIDEO = require("../../assets/images/login/Reel.mov");

// ── Main Screen ──────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cardBottom = insets.bottom + 16;
  const [videoReady, setVideoReady] = useState(false);
  const player = useVideoPlayer(HERO_VIDEO, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <View style={styles.container}>
      <Image
        source={HERO_IMAGE}
        style={styles.bgMedia}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE}
        priority="high"
      />
      <VideoView
        player={player}
        style={[styles.bgMedia, !videoReady && styles.hiddenMedia]}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        useExoShutter={false}
        onFirstFrameRender={() => setVideoReady(true)}
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.42)", "rgba(0,0,0,0.9)"]}
        locations={[0.1, 0.52, 0.93]}
        style={styles.gradient}
      />

      <View style={[styles.bottom, { paddingBottom: cardBottom }]}>
        <View style={styles.riderTag}>
          <Text style={styles.riderText}>@broken_dapper</Text>
          <Text style={styles.riderDivider}>/</Text>
          <Text style={styles.riderText}>Duluth, MN</Text>
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>
            Find the right bike.{"\n"}From the best builders on the planet.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace("/(auth)/apply")}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
            <Text style={styles.primaryButtonSubtext}>
              3 days free, then $100/year
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.secondaryButtonText}>Sign in</Text>
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
  hiddenMedia: { opacity: 0 },
  gradient: { ...StyleSheet.absoluteFillObject },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.page,
  },
  riderTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.whiteA35,
    paddingBottom: 7,
    marginBottom: 18,
  },
  riderText: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: F.monoMedium,
    color: COLORS.whiteA70,
    letterSpacing: 0.8,
  },
  riderDivider: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: F.mono,
    color: COLORS.whiteA40,
  },
  copyBlock: {
    paddingBottom: 2,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.monoBold,
    color: COLORS.whiteA60,
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontFamily: F.bold,
    color: COLORS.white,
    letterSpacing: 0,
    lineHeight: 38,
    marginBottom: 28,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: F.regular,
    color: COLORS.whiteA70,
    lineHeight: 23,
    marginTop: 14,
  },
  primaryButton: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: { fontSize: 16, fontFamily: F.bold, color: COLORS.black },
  primaryButtonSubtext: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: F.regular,
    color: COLORS.gray600,
    marginTop: 2,
  },
  secondaryButton: {
    alignItems: "center",
    paddingTop: 16,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.white,
  },
});
