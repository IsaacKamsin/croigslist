import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

// ── Hero media — images + video ──────────────────────────────────────
type HeroImage = {
  type: "image";
  source: number; // require() returns number
  credit: string;
  location: string;
  duration: number; // ms before rotating
};

type HeroVideo = {
  type: "video";
  source: number;
  credit: string;
  location: string;
  duration: number;
};

type HeroItem = HeroImage | HeroVideo;

const HERO_MEDIA: HeroItem[] = [
  // {
  //   type: "image",
  //   source: require("../../assets/images/login/IMG_1817.jpg"),
  //   credit: "@mikethompson",
  //   location: "Minneapolis, MN",
  //   duration: 5000,
  // },
  {
    type: "video",
    source: require("../../assets/images/login/Reel.mov"),
    credit: "@croigslist",
    location: "Twin Cities, MN",
    duration: 8000, // longer for video playback
  },
  // {
  //   type: "image",
  //   source: require("../../assets/images/login/IMG_5140.jpg"),
  //   credit: "@davidchang",
  //   location: "Portland, ME",
  //   duration: 5000,
  // },
  {
    type: "image",
    source: require("../../assets/images/login/IMG_5142.jpg"),
    credit: "@sarahkwon",
    location: "Duluth, MN",
    duration: 5000,
  },
];

const FADE_DURATION = 800;

const AnimatedImage = Animated.createAnimatedComponent(Image);

// ── Video Background ─────────────────────────────────────────────────
function VideoBackground({ source }: { source: number }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.bgMedia}
      nativeControls={false}
      contentFit="cover"
    />
  );
}

// ── Media Renderer ───────────────────────────────────────────────────
function HeroMedia({ item }: { item: HeroItem }) {
  if (item.type === "video") {
    return <VideoBackground source={item.source} />;
  }
  return (
    <Image
      source={item.source}
      style={styles.bgMedia}
      contentFit="cover"
      cachePolicy={IMAGE_CACHE}
    />
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const crossfade = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const scheduleNext = useCallback(() => {
    const current = HERO_MEDIA[currentIndex];
    timerRef.current = setTimeout(() => {
      // Fade out current
      crossfade.value = withTiming(0, {
        duration: FADE_DURATION,
        easing: Easing.inOut(Easing.ease),
      });

      // After fade, swap indices
      setTimeout(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % HERO_MEDIA.length;
          setNextIndex((next + 1) % HERO_MEDIA.length);
          return next;
        });
        crossfade.value = 1;
      }, FADE_DURATION);
    }, current.duration);
  }, [currentIndex, crossfade]);

  useEffect(() => {
    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleNext]);

  const currentStyle = useAnimatedStyle(() => ({
    opacity: crossfade.value,
  }));

  const current = HERO_MEDIA[currentIndex];
  const next = HERO_MEDIA[nextIndex];

  return (
    <View style={styles.container}>
      {/* Back layer — next item (revealed as current fades) */}
      <HeroMedia item={next} />

      {/* Front layer — current item (fades out) */}
      <Animated.View style={[styles.bgMediaWrap, currentStyle]}>
        <HeroMedia item={current} />
      </Animated.View>

      <LinearGradient
        colors={[COLORS.blackA10, COLORS.blackA85]}
        locations={[0.3, 0.85]}
        style={styles.gradient}
      />

      {/* Logo */}
      <View style={[styles.logoContainer, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.logo}>CROIGSLIST</Text>
      </View>

      {/* Bottom content */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        {/* Photo/video credit */}
        <View style={styles.creditRow}>
          <Text style={styles.creditText}>
            {current.credit} · {current.location}
          </Text>
        </View>

        <Text style={styles.title}>Private Motorcycle{"\n"}Registry</Text>
        <Text style={styles.subtitle}>
          A members-only registry for serious machines, real builders, and
          actual riders. No anonymous sellers. No junk. No algorithms.
        </Text>

        <View style={styles.buttons}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/(auth)/apply")}
          >
            <Text style={styles.primaryButtonText}>Apply</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
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
  bgMediaWrap: { ...StyleSheet.absoluteFillObject },
  gradient: { ...StyleSheet.absoluteFillObject },
  logoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.page,
  },
  logo: {
    fontSize: 15,
    fontFamily: F.bold,
    letterSpacing: 4,
    color: COLORS.white,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.page,
  },
  creditRow: {
    marginBottom: SPACING.md,
    alignSelf: "flex-start",
    backgroundColor: COLORS.blackA45,
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  creditText: {
    fontSize: 10,
    fontFamily: F.mono,
    letterSpacing: 0.5,
    color: COLORS.whiteA70,
  },
  title: {
    fontSize: 32,
    fontFamily: F.bold,
    color: COLORS.white,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: F.regular,
    color: COLORS.whiteA60,
    lineHeight: 22,
    marginTop: SPACING.md,
    maxWidth: 300,
  },
  buttons: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.xl },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: { fontSize: 15, fontFamily: F.bold, color: COLORS.black },
  secondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.whiteA40,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.white,
  },
});
