import { ScreenHeader } from "@/components/ScreenHeader";
import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { SHOPS } from "@/data/registry";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ShopCard({
  shop,
  onPress,
}: {
  shop: (typeof SHOPS)[0];
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: shop.image }}
          style={styles.cardImage}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
          recyclingKey={shop.image}
        />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{shop.name}</Text>
        <Text style={styles.cardSpecialty}>{shop.specialty}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.cardBuilds}>{shop.builds} BUILDS</Text>
          <Text style={styles.cardArrow}>→</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ShopsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="BUILDERS" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        <Text style={styles.subtitle}>
          Vetted builders and shops in the Twin Cities. Every one reviewed by the community.
        </Text>

        {SHOPS.map((shop) => (
          <ShopCard
            key={shop.id}
            shop={shop}
            onPress={() => router.push(`/shop/${shop.slug}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  header: S.screenHeader,
  title: S.screenTitle,
  divider: S.divider,
  list: {
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },

  // Card
  card: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.black,
    overflow: "hidden",
  },
  cardImageWrap: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.gray800,
  },
  cardImage: { width: "100%", height: "100%" },
  cardInfo: {
    padding: SPACING.md,
  },
  cardName: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  cardSpecialty: {
    fontSize: 10,
    fontFamily: F.mono,
    color: COLORS.whiteA40,
    letterSpacing: 0.5,
    marginTop: SPACING.xs,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
  },
  cardBuilds: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.whiteA30,
  },
  cardArrow: {
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.whiteA35,
  },
});
