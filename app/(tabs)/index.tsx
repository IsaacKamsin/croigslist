import {
  FeatureSection,
  HeroSection,
  JustListedSection,
  ProjectBikesSection,
  RareFindsSection,
  ShopsSection,
  SoldSection,
  Under5kSection,
} from "@/components/registry/sections";
import { COLORS, F, SPACING } from "@/constants/design";
import { hapticLight } from "@/hooks/useHaptics";
import { MagnifyingGlassIcon } from "phosphor-react-native";
import { useAuth } from "@/context/AuthContext";
import { FEATURED } from "@/data/registry";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

export default function RegistryScreen() {
  const router = useRouter();
  const { member } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: fetch fresh data from API
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const goListing = useCallback(
    (id: string) => router.push(`/listing/${id}`),
    [router],
  );
  const goBuilder = useCallback(
    (id: string) => router.push(`/builder/${id}`),
    [router],
  );
  const goShop = useCallback(
    (slug: string) => router.push(`/shop/${slug}`),
    [router],
  );
  const goFeatured = useCallback(() => goListing(FEATURED.id), [goListing]);
  const goCategory = useCallback(
    (key: "just-listed" | "under-5k" | "project-bikes") => {
      hapticLight();
      router.push(`/listing/category/${key}`);
    },
    [router],
  );
  const goJustListed = useCallback(() => goCategory("just-listed"), [goCategory]);
  const goUnder5k = useCallback(() => goCategory("under-5k"), [goCategory]);
  const goProjectBikes = useCallback(() => goCategory("project-bikes"), [goCategory]);
  const goAllShops = useCallback(() => {
    hapticLight();
    router.push("/(tabs)/shops");
  }, [router]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.userName}>{member?.name ?? "Member"}</Text>
        </View>
        <Pressable
          style={s.listBtn}
          onPress={() => router.push("/listing/create")}
        >
          <Text style={s.listBtnText}>+ LIST</Text>
        </Pressable>
        <Pressable
          style={s.searchBtn}
          onPress={() => { hapticLight(); router.push("/(tabs)/search"); }}
          hitSlop={8}
        >
          <MagnifyingGlassIcon color={COLORS.textPrimary} size={20} weight="bold" />
        </Pressable>
      </View>

      <View style={s.catDivider} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <HeroSection onPress={goFeatured} />
        <JustListedSection goListing={goListing} onSeeAll={goJustListed} />
        <Under5kSection goListing={goListing} onSeeAll={goUnder5k} />
        <RareFindsSection goListing={goListing} />
        <ProjectBikesSection goListing={goListing} onSeeAll={goProjectBikes} />
        <ShopsSection goShop={goShop} onSeeAll={goAllShops} />
        <FeatureSection goBuilder={goBuilder} />
        <SoldSection />
        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

const P = SPACING.page;
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: P,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 12,
  },
  greeting: {
    fontSize: 11,
    fontFamily: F.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 22,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginTop: -1,
  },
  listBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  listBtnText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.black,
  },
  searchBtn: { padding: 6 },
  catDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: P,
  },
});
