import {
  AccentBadge,
  BodySmall,
  CardPrice,
  CardTitle,
  Chip,
  Divider,
  Label,
  LabelBold,
  MonoSmall,
  PagePad,
  Row,
  Stack,
} from "@/components/ui/primitives";
import { ScreenHeader } from "@/components/ScreenHeader";
import { LinearGradient } from "expo-linear-gradient";
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from "@/hooks/useHaptics";
import { S } from "@/constants/styles";
import { COLORS, F, IMAGE_CACHE, SPACING, TYPE } from "@/constants/design";
import { useBikeVision } from "@/hooks/useBikeVision";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ── Types ────────────────────────────────────────────────────────────
interface GarageBike {
  id: string;
  imageUri: string;
  brand?: string;
  model?: string;
  yearEstimate?: string;
  frameType?: string;
  color?: string;
  condition?: string;
  vibe?: string;
  confidence?: number;
  processing: boolean;
  createdAt: Date;
}

interface MatchListing {
  id: string;
  title: string;
  price: number;
  imageUri: string;
  matchScore: number;
  location: string;
  postedAt: string;
}

// ── Simulated matches for Royal Enfield Hunter 350 ───────────────────
const HUNTER_MATCHES: MatchListing[] = [
  {
    id: "re1",
    title: "2023 Royal Enfield Hunter 350 — 800mi",
    price: 3400,
    imageUri:
      "https://images.unsplash.com/photo-1622185135505-2d795003994a?w=400",
    matchScore: 96,
    location: "Minneapolis, MN",
    postedAt: "1h ago",
  },
  {
    id: "re2",
    title: "Royal Enfield Hunter 350 Retro Custom",
    price: 4100,
    imageUri:
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=400",
    matchScore: 89,
    location: "St. Paul, MN",
    postedAt: "3h ago",
  },
  {
    id: "re3",
    title: "2024 RE Hunter 350 — Matte Black",
    price: 3800,
    imageUri: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400",
    matchScore: 85,
    location: "Bloomington, MN",
    postedAt: "1d ago",
  },
];

function isHunterMatch(brand?: string, model?: string): boolean {
  const b = (brand ?? "").toLowerCase();
  const m = (model ?? "").toLowerCase();
  return (
    (b.includes("royal") && b.includes("enfield")) ||
    m.includes("hunter") ||
    (b.includes("enfield") && m.includes("350"))
  );
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = SPACING.md;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.page * 2 - GRID_GAP) / 2;

// ── Match Toast Notification ─────────────────────────────────────────
function MatchToast({
  match,
  bikeName,
  onPress,
  onDismiss,
}: {
  match: MatchListing;
  bikeName: string;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-200);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 160 });

    const timeout = setTimeout(() => {
      translateY.value = withTiming(-200, { duration: 300 }, () => {
        runOnJS(onDismiss)();
      });
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.toastWrap, { paddingTop: insets.top + 8 }, animStyle]}
    >
      <Pressable style={styles.toast} onPress={onPress}>
        <View style={styles.toastAccent} />
        <Image
          source={{ uri: match.imageUri }}
          style={styles.toastImage}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
        />
        <View style={styles.toastContent}>
          <Text style={styles.toastLabel}>MATCH FOUND</Text>
          <Text style={styles.toastTitle} numberOfLines={1}>
            {match.title}
          </Text>
          <View style={styles.toastMeta}>
            <Text style={styles.toastPrice}>
              ${match.price.toLocaleString()}
            </Text>
            <Text style={styles.toastDot}>·</Text>
            <Text style={styles.toastScore}>{match.matchScore}% match</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Match Card ───────────────────────────────────────────────────────
function MatchCard({
  match,
  onPress,
}: {
  match: MatchListing;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.matchCard} onPress={onPress}>
      <Image
        source={{ uri: match.imageUri }}
        style={styles.matchImage}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE}
        transition={150}
      />
      <Stack gap={4} style={{ flex: 1 }}>
        <Row align="flex-start" gap={SPACING.sm}>
          <CardTitle numberOfLines={2} style={{ flex: 1, fontSize: 13 }}>
            {match.title}
          </CardTitle>
          <AccentBadge>{`${match.matchScore}%`}</AccentBadge>
        </Row>
        <CardPrice>{`$${match.price.toLocaleString()}`}</CardPrice>
        <Row gap={4}>
          <MonoSmall>{match.location}</MonoSmall>
          <MonoSmall>·</MonoSmall>
          <MonoSmall>{match.postedAt}</MonoSmall>
        </Row>
      </Stack>
    </Pressable>
  );
}

// ── Pulsing Dot (ambient "watching" indicator) ──────────────────────
function PulsingDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 1200 }),
      -1,
      true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.watchingDot, style]} />
  );
}

// ── Scan Line Animation ──────────────────────────────────────────────
function ScanOverlay() {
  const scanY = useSharedValue(0);

  useEffect(() => {
    scanY.value = withRepeat(
      withTiming(1, { duration: 1800 }),
      -1,
      true,
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    top: `${scanY.value * 100}%` as any,
  }));

  return (
    <View style={styles.processingOverlay}>
      <Animated.View style={[styles.scanLine, lineStyle]} />
      <View style={styles.scanLabelWrap}>
        <View style={styles.scanDot} />
        <Text style={styles.processingLabel}>IDENTIFYING</Text>
      </View>
    </View>
  );
}

// ── Bike Card ────────────────────────────────────────────────────────
function GarageBikeCard({
  bike,
  matchCount,
  onPress,
}: {
  bike: GarageBike;
  matchCount: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: bike.imageUri }}
          style={styles.cardImage}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
          transition={200}
        />
        {bike.processing && <ScanOverlay />}
        {!bike.processing && matchCount > 0 && (
          <AccentBadge
            style={styles.cardMatchBadge}
          >{`${matchCount}`}</AccentBadge>
        )}
      </View>

      {bike.processing ? (
        <View style={{ paddingTop: SPACING.sm }}>
          <Text style={styles.scanningHint}>Analyzing photo...</Text>
        </View>
      ) : bike.brand ? (
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{ paddingTop: SPACING.sm }}
        >
          <View style={styles.idBadgeRow}>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>IDENTIFIED</Text>
            </View>
            {bike.confidence != null && bike.confidence >= 0.8 && (
              <Text style={styles.confidenceText}>
                {Math.round(bike.confidence * 100)}%
              </Text>
            )}
          </View>
          <Text style={styles.idYear}>
            {bike.yearEstimate ?? ""} · {bike.brand}
          </Text>
          <Text style={styles.idModel} numberOfLines={1}>
            {bike.model ?? ""}
          </Text>
          {bike.frameType && (
            <Text style={styles.idBuild}>
              {bike.frameType.toUpperCase()}
            </Text>
          )}
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export default function GarageScreen() {
  const router = useRouter();
  const [bikes, setBikes] = useState<GarageBike[]>([]);
  const [matches, setMatches] = useState<Record<string, MatchListing[]>>({});
  const [selectedBike, setSelectedBike] = useState<GarageBike | null>(null);
  const [toastData, setToastData] = useState<{
    match: MatchListing;
    bikeName: string;
    bikeId: string;
  } | null>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["72%"], []);
  const { analyze } = useBikeVision();

  const handleUpload = async () => {
    hapticMedium();
    console.log("🟡 [Vault] Upload started");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

    const imageUri = pickerResult.assets[0].uri;
    const bikeId = Date.now().toString();

    const newBike: GarageBike = {
      id: bikeId,
      imageUri,
      processing: true,
      createdAt: new Date(),
    };

    setBikes((prev) => [newBike, ...prev]);

    const analysis = await analyze(imageUri);

    if (analysis) {
      const brand = analysis.baseBike.brand.toUpperCase();
      const model = analysis.baseBike.model;

      console.log("✅ [Vault] Identified:", brand, model);
      hapticSuccess();

      setBikes((prev) =>
        prev.map((b) =>
          b.id === bikeId
            ? {
                ...b,
                processing: false,
                brand,
                model,
                yearEstimate: analysis.baseBike.yearEstimate,
                frameType: analysis.buildStyle,
                color: analysis.colorScheme,
                condition: analysis.overallCondition,
                vibe: analysis.vibe,
                confidence: analysis.confidence,
              }
            : b,
        ),
      );

      if (isHunterMatch(brand, model)) {
        console.log("🟢 [Vault] Hunter 350 detected! Simulating matches...");
        setTimeout(() => {
          hapticWarning();
          setMatches((prev) => ({ ...prev, [bikeId]: HUNTER_MATCHES }));
          setToastData({
            match: HUNTER_MATCHES[0],
            bikeName: `${brand} ${model}`,
            bikeId,
          });
        }, 2000);
      }
    } else {
      hapticWarning();
      setBikes((prev) =>
        prev.map((b) =>
          b.id === bikeId
            ? {
                ...b,
                processing: false,
                brand: "UNIDENTIFIED",
                model: "Tap to retry",
                condition: undefined,
              }
            : b,
        ),
      );
    }
  };

  const retryAnalysis = async (bike: GarageBike) => {
    setBikes((prev) =>
      prev.map((b) => (b.id === bike.id ? { ...b, processing: true, brand: undefined, model: undefined } : b)),
    );
    const analysis = await analyze(bike.imageUri);
    if (analysis) {
      hapticSuccess();
      const brand = analysis.baseBike.brand.toUpperCase();
      const model = analysis.baseBike.model;
      setBikes((prev) =>
        prev.map((b) =>
          b.id === bike.id
            ? {
                ...b,
                processing: false,
                brand,
                model,
                yearEstimate: analysis.baseBike.yearEstimate,
                frameType: analysis.buildStyle,
                color: analysis.colorScheme,
                condition: analysis.overallCondition,
                vibe: analysis.vibe,
                confidence: analysis.confidence,
              }
            : b,
        ),
      );
    } else {
      hapticWarning();
      setBikes((prev) =>
        prev.map((b) =>
          b.id === bike.id
            ? { ...b, processing: false, brand: "UNIDENTIFIED", model: "Tap to retry" }
            : b,
        ),
      );
    }
  };

  const openSheet = useCallback((bike: GarageBike) => {
    setSelectedBike(bike);
    sheetRef.current?.snapToIndex(0);
  }, []);

  const openSheetById = useCallback(
    (bikeId: string) => {
      const bike = bikes.find((b) => b.id === bikeId);
      if (bike) {
        setSelectedBike(bike);
        sheetRef.current?.snapToIndex(0);
      }
    },
    [bikes],
  );

  const handleSheetChange = useCallback((index: number) => {
    if (index >= 0) hapticLight();
    if (index === -1) setSelectedBike(null);
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    [],
  );

  const selectedMatches = selectedBike ? (matches[selectedBike.id] ?? []) : [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <ScreenHeader title="GARAGE" />

        {bikes.length > 0 && (
          <PagePad style={{ marginTop: SPACING.xxl }}>
            <Label>{`${bikes.length} BIKE${bikes.length !== 1 ? "S" : ""}`}</Label>
          </PagePad>
        )}

        {bikes.length > 0 ? (
          <View style={styles.grid}>
            {bikes.map((bike) => (
              <GarageBikeCard
                key={bike.id}
                bike={bike}
                matchCount={matches[bike.id]?.length ?? 0}
                onPress={() => {
                  if (bike.processing) return;
                  if (bike.brand === "UNIDENTIFIED") {
                    retryAnalysis(bike);
                    return;
                  }
                  openSheet(bike);
                }}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=80",
              }}
              style={styles.emptyImage}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE}
            />
            <LinearGradient
              colors={["transparent", COLORS.overlay85, COLORS.black]}
              locations={[0.15, 0.5, 1]}
              style={styles.emptyGradient}
            >
              <View style={styles.emptyContent}>
                <Text style={styles.emptyLabel}>YOUR GARAGE IS EMPTY</Text>
                <Text style={styles.emptyHeadline}>
                  Every collection{"\n"}starts with one.
                </Text>
                <Text style={styles.emptyBody}>
                  Upload a photo of any bike you're after. We'll identify it
                  and watch the registry for matches — so you don't have to.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyCta,
                    pressed && styles.emptyCtaPressed,
                  ]}
                  onPress={handleUpload}
                >
                  <Text style={styles.emptyCtaText}>+ ADD YOUR FIRST BIKE</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* Add bike button — only when garage has bikes (empty state has its own CTA) */}
      {bikes.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={handleUpload}
        >
          <Text style={styles.fabLabel}>+ ADD BIKE</Text>
        </Pressable>
      )}

      {/* Match Toast */}
      {toastData && (
        <MatchToast
          match={toastData.match}
          bikeName={toastData.bikeName}
          onPress={() => {
            setToastData(null);
            openSheetById(toastData.bikeId);
          }}
          onDismiss={() => setToastData(null)}
        />
      )}

      {/* Bottom Sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBg}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          {selectedBike && (
            <>
              <PagePad>
                <Row gap={SPACING.md} align="flex-start">
                  <Image
                    source={{ uri: selectedBike.imageUri }}
                    style={styles.summaryImage}
                    contentFit="cover"
                    cachePolicy={IMAGE_CACHE}
                  />
                  <Stack gap={2} style={{ flex: 1, justifyContent: "center" }}>
                    <Label>{selectedBike.brand ?? ""}</Label>
                    <Text style={TYPE.sectionHeader}>{selectedBike.model}</Text>
                    <Row
                      wrap
                      gap={SPACING.xs}
                      style={{ marginTop: SPACING.sm }}
                    >
                      {selectedBike.frameType && (
                        <Chip>{selectedBike.frameType.toUpperCase()}</Chip>
                      )}
                      {selectedBike.color && (
                        <Chip>{selectedBike.color.toUpperCase()}</Chip>
                      )}
                      {selectedBike.condition && (
                        <Chip>{selectedBike.condition.toUpperCase()}</Chip>
                      )}
                    </Row>
                    {selectedBike.vibe && (
                      <Text style={styles.vibeText}>{selectedBike.vibe}</Text>
                    )}
                  </Stack>
                </Row>
              </PagePad>

              <Divider
                style={{
                  marginHorizontal: SPACING.page,
                  marginVertical: SPACING.lg,
                }}
              />

              <PagePad>
                <Label style={{ marginBottom: SPACING.md }}>
                  {selectedMatches.length > 0
                    ? `${selectedMatches.length} POTENTIAL MATCH${selectedMatches.length !== 1 ? "ES" : ""}`
                    : "NO MATCHES YET"}
                </Label>

                {selectedMatches.length > 0 ? (
                  selectedMatches.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      onPress={() => {
                        sheetRef.current?.close();
                        router.push(`/listing/${m.id}`);
                      }}
                    />
                  ))
                ) : (
                  <Stack gap={SPACING.sm}>
                    <LabelBold>WATCHING THE MARKET</LabelBold>
                    <BodySmall style={{ maxWidth: 280 }}>
                      We're scanning every new listing for this bike. When one
                      surfaces, you'll know before anyone else.
                    </BodySmall>
                    <Row gap={SPACING.sm} style={{ marginTop: SPACING.xs }}>
                      <PulsingDot />
                      <Text style={styles.watchingLabel}>ACTIVE</Text>
                    </Row>
                  </Stack>
                )}
              </PagePad>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: S.screenHeader,
  title: S.screenTitle,
  headerDivider: S.divider,
  content: { flexGrow: 1 },

  // Empty state
  emptyWrap: {
    flex: 1,
  },
  emptyImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  emptyGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  emptyContent: {
    paddingHorizontal: SPACING.page,
    paddingBottom: SPACING.xxl,
  },
  emptyLabel: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.whiteA50,
  },
  emptyHeadline: {
    fontSize: 28,
    fontFamily: F.bold,
    color: COLORS.white,
    letterSpacing: -0.5,
    lineHeight: 32,
    marginTop: SPACING.sm,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.whiteA60,
    lineHeight: 21,
    marginTop: SPACING.md,
    maxWidth: 300,
  },
  emptyCta: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    marginTop: SPACING.xl,
    alignSelf: "flex-start",
  },
  emptyCtaPressed: { opacity: 0.85 },
  emptyCtaText: {
    fontSize: 11,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.black,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACING.page,
    gap: GRID_GAP,
    marginTop: SPACING.md,
  },
  card: { width: CARD_WIDTH, marginBottom: SPACING.xs },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: "100%" },
  cardMatchBadge: { position: "absolute", top: SPACING.sm, right: SPACING.sm },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay75,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    padding: 12,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  scanLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scanDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  processingLabel: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.accent,
  },
  scanningHint: {
    fontSize: 11,
    fontFamily: F.mono,
    color: COLORS.textFaint,
    letterSpacing: 0.5,
  },

  // Identification result
  idBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  idBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  idBadgeText: {
    fontSize: 7,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.black,
  },
  confidenceText: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.textFaint,
  },
  idYear: {
    fontSize: 9,
    fontFamily: F.mono,
    color: COLORS.textFaint,
    letterSpacing: 1,
  },
  idModel: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginTop: 1,
  },
  idBuild: {
    fontSize: 9,
    fontFamily: F.monoMedium,
    letterSpacing: 1,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: SPACING.page,
    backgroundColor: COLORS.black,
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabPressed: { backgroundColor: COLORS.accent },
  fabLabel: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.white,
  },
  toastWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: SPACING.page,
  },
  toast: {
    flexDirection: "row",
    backgroundColor: COLORS.black,
    overflow: "hidden",
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  toastAccent: {
    width: 4,
    backgroundColor: COLORS.accent,
  },
  toastImage: {
    width: 56,
    height: 56,
  },
  toastContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  toastLabel: {
    fontSize: 8,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.accent,
  },
  toastTitle: {
    fontSize: 13,
    fontFamily: F.bold,
    color: COLORS.white,
    marginTop: 2,
  },
  toastMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  toastPrice: {
    fontSize: 11,
    fontFamily: F.monoMedium,
    color: COLORS.whiteA60,
  },
  toastDot: {
    fontSize: 11,
    color: COLORS.whiteA30,
  },
  toastScore: {
    fontSize: 10,
    fontFamily: F.mono,
    color: COLORS.accent,
  },
  sheetBg: { backgroundColor: COLORS.bg },
  handleIndicator: { backgroundColor: COLORS.gray300, width: 36, height: 4 },
  summaryImage: { width: 90, height: 120, backgroundColor: COLORS.surface },
  vibeText: {
    fontSize: 12,
    fontFamily: F.regular,
    fontStyle: "italic",
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    lineHeight: 17,
  },
  matchCard: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.divider,
    paddingBottom: SPACING.md,
  },
  matchImage: { width: 72, height: 72, backgroundColor: COLORS.surface },
  watchingDot: { width: 6, height: 6, backgroundColor: COLORS.accent },
  watchingLabel: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.accent,
  },
});
