import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import type { RegistryShop } from "@/lib/registry-db";
import { Image } from "expo-image";
import { HeartIcon } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

type ProfileRailConfig = {
  key: string;
  title: string;
  items: RegistryShop[];
  query: string;
};

function profileSearchText(profile: RegistryShop) {
  return [
    profile.name,
    profile.specialty,
    profile.tagline,
    profile.location,
    profile.address,
    ...(profile.badges ?? []),
    ...(profile.buildStyles ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function profileMatches(profile: RegistryShop, terms: string[]) {
  const searchText = profileSearchText(profile);
  return terms.some((term) => searchText.includes(term));
}

function buildProfileRails(profiles: RegistryShop[]): ProfileRailConfig[] {
  const verifiedProfiles = profiles.filter((profile) => profile.verified);
  const inventory = profiles.filter((profile) => profile.builds > 0);
  const newProfiles = profiles.slice(0, 8);
  const minneapolis = profiles.filter((profile) => profileMatches(profile, ["minneapolis"]));
  const japanese = profiles.filter((profile) =>
    profileMatches(profile, ["japanese", "honda", "yamaha", "suzuki", "kawasaki"]),
  );
  const custom = profiles.filter((profile) => profileMatches(profile, ["custom", "fabrication", "build"]));
  const restoration = profiles.filter((profile) =>
    profileMatches(profile, ["restoration", "restore", "restored", "vintage"]),
  );
  return [
    {
      key: "verified",
      title: "Verified builders",
      items: verifiedProfiles,
      query: "BUILDERS",
    },
    {
      key: "inventory",
      title: "Builders with inventory",
      items: inventory,
      query: "BUILDERS",
    },
    {
      key: "new",
      title: "New builders",
      items: newProfiles,
      query: "BUILDERS",
    },
    {
      key: "minneapolis",
      title: "Minneapolis builders",
      items: minneapolis,
      query: "MINNEAPOLIS",
    },
    {
      key: "japanese",
      title: "Japanese classics",
      items: japanese,
      query: "Japanese",
    },
    {
      key: "custom",
      title: "Custom builds",
      items: custom,
      query: "Custom",
    },
    {
      key: "restoration",
      title: "Restoration specialists",
      items: restoration,
      query: "Restoration",
    },
  ];
}

function ProfileCard({
  profile,
  onPress,
  isFavorite,
  onToggleFavorite,
}: {
  profile: RegistryShop;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const contactCount = [profile.email, profile.phone, profile.website].filter(Boolean).length;
  const location = profile.location ?? profile.address ?? "Location not set";

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        {profile.image ? (
          <Image
            source={{ uri: profile.image }}
            style={styles.image}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE}
            recyclingKey={profile.image}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageInitial}>{profile.name.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        {profile.verified ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Verified</Text>
          </View>
        ) : null}
        <Pressable
          style={styles.favoriteButton}
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          hitSlop={8}
        >
          <HeartIcon
            color={COLORS.white}
            size={24}
            weight={isFavorite ? "fill" : "bold"}
          />
        </Pressable>
      </View>
      <Text style={styles.name} numberOfLines={2}>{profile.name}</Text>
      <Text style={styles.meta} numberOfLines={1}>{profile.specialty}</Text>
      <Text style={styles.sub} numberOfLines={1}>{location}</Text>
      <Text style={styles.signal}>
        {profile.builds} listings · {contactCount > 0 ? "contact ready" : "message only"}
      </Text>
    </Pressable>
  );
}

function ProfileSection({
  title,
  items,
  favoriteProfileIds,
  onToggleFavorite,
  onPress,
  onOpenAll,
  isFirst = false,
}: {
  title: string;
  items: RegistryShop[];
  favoriteProfileIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onPress: (profile: RegistryShop) => void;
  onOpenAll: () => void;
  isFirst?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <View style={[styles.section, isFirst && styles.sectionFirst]}>
      <View style={styles.sectionHeader}>
        <Pressable
          style={styles.sectionTitleBlock}
          onPress={onOpenAll}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`View all ${title}`}
        >
          <Text style={styles.sectionTitle}>{title}</Text>
        </Pressable>
        <Pressable onPress={onOpenAll} hitSlop={12}>
          <Text style={styles.seeAll}>SEE ALL</Text>
        </Pressable>
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        renderItem={({ item }) => (
          <ProfileCard
            profile={item}
            isFavorite={favoriteProfileIds.has(item.id)}
            onToggleFavorite={() => onToggleFavorite(item.id)}
            onPress={() => onPress(item)}
          />
        )}
      />
    </View>
  );
}

export function ProfileRails({
  profiles,
  onOpenProfile,
  onOpenRail,
}: {
  profiles: RegistryShop[];
  onOpenProfile: (profile: RegistryShop) => void;
  onOpenRail?: (query: string) => void;
}) {
  const visibleProfiles = profiles;
  const rails = useMemo(() => buildProfileRails(visibleProfiles), [visibleProfiles]);
  const [favoriteProfileIds, setFavoriteProfileIds] = useState<Set<string>>(() => new Set());
  const favoriteProfiles = useMemo(
    () => visibleProfiles.filter((profile) => favoriteProfileIds.has(profile.id)),
    [favoriteProfileIds, visibleProfiles],
  );
  const toggleFavoriteProfile = useCallback((id: string) => {
    setFavoriteProfileIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (visibleProfiles.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {favoriteProfiles.length > 0 ? (
        <ProfileSection
          title="Fave builders"
          items={favoriteProfiles}
          favoriteProfileIds={favoriteProfileIds}
          onToggleFavorite={toggleFavoriteProfile}
          onPress={onOpenProfile}
          onOpenAll={() => onOpenRail?.("BUILDERS")}
          isFirst
        />
      ) : null}

      {rails.map((rail, index) => (
        <ProfileSection
          key={rail.key}
          title={rail.title}
          items={rail.items}
          favoriteProfileIds={favoriteProfileIds}
          onToggleFavorite={toggleFavoriteProfile}
          onPress={onOpenProfile}
          onOpenAll={() => onOpenRail?.(rail.query)}
          isFirst={favoriteProfiles.length === 0 && index === 0}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 0,
  },
  section: {
    paddingTop: 40,
  },
  sectionFirst: {
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.page,
    marginBottom: SPACING.md,
  },
  sectionTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: F.monoMedium,
    letterSpacing: 1.1,
    color: COLORS.textMuted,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 1,
    marginTop: 5,
  },
  rail: {
    paddingHorizontal: SPACING.page,
    gap: SPACING.md,
  },
  card: {
    width: 156,
    marginRight: SPACING.md,
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  imageInitial: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.black,
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: COLORS.black,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  badgeText: {
    fontSize: 12,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  favoriteButton: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.overlay35,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.whiteA50,
  },
  name: {
    fontSize: 16,
    lineHeight: 19,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  meta: {
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sub: {
    fontSize: 13,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  signal: {
    fontSize: 13,
    fontFamily: F.semibold,
    color: COLORS.textMuted,
    letterSpacing: 0,
    marginTop: 5,
  },
});
