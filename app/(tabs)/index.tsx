import { ListBikeSheet, type ListBikeSheetRef } from "@/components/ListBikeSheet";
import { ProfileRails } from "@/components/registry/ProfileRails";
import {
  ListingGridSection,
  SoldSection,
} from "@/components/registry/sections";
import { COLORS, F, SPACING } from "@/constants/design";
import { useAuth } from "@/context/AuthContext";
import { hapticLight } from "@/hooks/useHaptics";
import { formatUsd } from "@/lib/formatters";
import {
  fetchGarageDetails,
  updateGarageDetails,
  type GarageDetails,
} from "@/lib/garage-profile-db";
import {
  fetchSellerOffers,
  respondToListingOffer,
  type ListingOffer,
} from "@/lib/offers-db";
import {
  fetchMyProfileCompletion,
  updateMyProfilePhoto,
} from "@/lib/profile-completion-db";
import {
  fetchMyListings,
  fetchRegistryData,
  type RegistryListing,
  type RegistryShop,
} from "@/lib/registry-db";
import { shareSellerInvite } from "@/lib/share";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { MagnifyingGlassIcon, PlusIcon, SlidersHorizontalIcon } from "phosphor-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Modal,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

export default function RegistryScreen() {
  const router = useRouter();
  const { activeView, member, memberStatus, refreshMemberProfile } = useAuth();
  const isBuilder = activeView === "builder";
  const queryClient = useQueryClient();
  const listBikeSheetRef = useRef<ListBikeSheetRef>(null);
  const [profilePhoto, setProfilePhoto] = useState<{
    uri: string;
    base64?: string;
    mimeType?: string;
  } | null>(null);
  const [savingProfilePhoto, setSavingProfilePhoto] = useState(false);
  const [garageImage, setGarageImage] = useState<{
    uri: string;
    base64?: string;
    mimeType?: string;
  } | null>(null);
  const [savingGarageImage, setSavingGarageImage] = useState(false);
  const { data, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["home", activeView],
    queryFn: async () => {
      if (activeView === "builder") {
        return {
          registryData: null,
          myListings: await fetchMyListings(),
          garageDetails: await fetchGarageDetails().catch(() => null),
          offers: await fetchSellerOffers().catch(() => [] as ListingOffer[]),
        };
      }

      return {
        registryData: await fetchRegistryData(),
        myListings: [] as RegistryListing[],
        garageDetails: null as GarageDetails | null,
        offers: [] as ListingOffer[],
      };
    },
  });
  const registryData = data?.registryData ?? null;
  const myListings = data?.myListings ?? [];
  const garageDetails = data?.garageDetails ?? null;
  const offers = data?.offers ?? [];
  const { data: profileCompletion } = useQuery({
    queryKey: ["my-profile-completion"],
    queryFn: fetchMyProfileCompletion,
    enabled: Boolean(member?.id),
    initialData: { accountName: "", garageName: "", avatarUrl: "" },
  });
  const bikesForSale =
    registryData?.bikesForSale ?? registryData?.justListed ?? [];
  const shops = registryData?.shops ?? [];
  const requiresProfilePhoto = Boolean(
    member?.id && !profileCompletion.avatarUrl && !member.avatarUrl,
  );
  const requiresGarageImage = Boolean(
    isBuilder && member?.id && garageDetails && !garageDetails.garageImageUrl,
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
  const pickProfilePhoto = useCallback(async () => {
    hapticLight();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access to add your account picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setProfilePhoto({
      uri: asset.uri,
      base64: asset.base64 ?? undefined,
      mimeType: asset.base64 ? "image/jpeg" : asset.mimeType ?? undefined,
    });
  }, []);
  const saveProfilePhoto = useCallback(async () => {
    if (!profilePhoto) {
      Alert.alert("Profile photo required", "Add a photo for this account before continuing.");
      return;
    }

    setSavingProfilePhoto(true);
    try {
      const avatarUrl = await updateMyProfilePhoto({
        avatarUri: profilePhoto.uri,
        avatarData: {
          base64: profilePhoto.base64,
          mimeType: profilePhoto.mimeType,
        },
      });
      queryClient.setQueryData(["my-profile-completion"], {
        ...(profileCompletion ?? { accountName: "", garageName: "", avatarUrl: "" }),
        avatarUrl: avatarUrl || profilePhoto.uri,
      });
      await queryClient.invalidateQueries({ queryKey: ["my-profile-completion"] });
      await refreshMemberProfile();
      hapticLight();
    } catch (error) {
      Alert.alert(
        "Could not save photo",
        error instanceof Error ? error.message : "Try again in a moment.",
      );
    } finally {
      setSavingProfilePhoto(false);
    }
  }, [profileCompletion, profilePhoto, queryClient, refreshMemberProfile]);
  const pickGarageImage = useCallback(async () => {
    hapticLight();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access to add your garage picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setGarageImage({
      uri: asset.uri,
      base64: asset.base64 ?? undefined,
      mimeType: asset.base64 ? "image/jpeg" : asset.mimeType ?? undefined,
    });
  }, []);
  const saveGarageImage = useCallback(async () => {
    if (!garageImage) {
      Alert.alert("Garage picture required", "Add a garage picture before continuing.");
      return;
    }

    setSavingGarageImage(true);
    try {
      await updateGarageDetails(
        garageDetails ?? {
          garageName: "",
          garageImageUrl: "",
          contactEmail: "",
          phone: "",
          website: "",
          city: "",
          bio: "",
        },
        {
          uri: garageImage.uri,
          data: {
            base64: garageImage.base64,
            mimeType: garageImage.mimeType,
          },
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["garage-details"] }),
      ]);
      setGarageImage(null);
      hapticLight();
    } catch (error) {
      Alert.alert(
        "Could not save garage picture",
        error instanceof Error ? error.message : "Try again in a moment.",
      );
    } finally {
      setSavingGarageImage(false);
    }
  }, [garageDetails, garageImage, queryClient]);

  const goListing = useCallback(
    (id: string) => router.push(`/listing/${id}`),
    [router],
  );
  const goProfile = useCallback(
    (profile: RegistryShop) => {
      router.push(
        profile.kind === "profile"
          ? `/builder/${profile.slug}`
          : `/shop/${profile.slug}`,
      );
    },
    [router],
  );
  const goCategory = useCallback(
    (key: "bikes" | "just-listed" | "under-5k" | "project-bikes") => {
      hapticLight();
      router.push(`/listing/category/${key}`);
    },
    [router],
  );
  const goBikes = useCallback(() => goCategory("bikes"), [goCategory]);
  const goJustListed = useCallback(
    () => goCategory("just-listed"),
    [goCategory],
  );
  const goUnder5k = useCallback(() => goCategory("under-5k"), [goCategory]);
  const goProjectBikes = useCallback(
    () => goCategory("project-bikes"),
    [goCategory],
  );
  const goSearch = useCallback(() => {
    hapticLight();
    router.push("/(tabs)/search");
  }, [router]);

  const openSellBikeMenu = useCallback(() => {
    listBikeSheetRef.current?.open();
  }, []);
  const hasBuyerInventory = Boolean(
    registryData &&
    (registryData.featured ||
      bikesForSale.length > 0 ||
      registryData.justListed.length > 0 ||
      registryData.under5k.length > 0 ||
      registryData.rareFinds.length > 0 ||
      registryData.projectBikes.length > 0 ||
      shops.length > 0 ||
      registryData.sold.length > 0),
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {isBuilder ? (
        <View style={s.header}>
          <Pressable style={s.garageLogo} onPress={() => router.push("/garage/details")}>
            {garageDetails?.garageImageUrl ? (
              <Image
                source={{ uri: garageDetails.garageImageUrl }}
                style={s.garageLogoImage}
                contentFit="cover"
              />
            ) : (
              <Text style={s.garageLogoText}>
                {(garageDetails?.garageName || member?.handle || "G").slice(0, 1).toUpperCase()}
              </Text>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.userName} numberOfLines={1}>
              {garageDetails?.garageName || member?.handle || "Seller"}
            </Text>
          </View>
          <Pressable
            style={s.listBtn}
            onPress={openSellBikeMenu}
          >
            <Text style={s.listBtnText}>LIST A BIKE</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.buyerHeader}>
          <Pressable style={s.sellBikeButton} onPress={openSellBikeMenu}>
            <PlusIcon size={16} color={COLORS.white} weight="bold" />
            <Text style={s.sellBikeText}>SELL</Text>
          </Pressable>
          <Pressable style={s.searchPill} onPress={goSearch}>
            <MagnifyingGlassIcon
              size={18}
              color={COLORS.textPrimary}
              weight="bold"
            />
            <Text style={s.searchPillText}>
              Search bikes or builders
            </Text>
          </Pressable>
          <Pressable
            style={s.filterButton}
            onPress={goSearch}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <SlidersHorizontalIcon
              size={19}
              color={COLORS.textPrimary}
              weight="bold"
            />
          </Pressable>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.accent}
          />
        }
      >
        {isBuilder ? (
          isPending ? (
            <View style={s.loadingState}>
              <ActivityIndicator color={COLORS.textPrimary} />
            </View>
          ) : (
          <BuilderDashboard
            listings={myListings}
            garageDetails={garageDetails}
            onCreate={openSellBikeMenu}
            onGarageDetails={() => router.push("/garage/details")}
            onOpenListing={goListing}
            offers={offers}
            onOpenOffer={(offer) => {
              router.push({
                pathname: "/messages/[id]",
                params: {
                  id: offer.conversationId,
                  buyerName: offer.buyerName ?? "Buyer",
                  sellerName: garageDetails?.garageName ?? "Seller",
                  listingTitle: offer.listingTitle ?? "Listing conversation",
                  pendingOfferAmount: String(offer.amount),
                  pendingOfferId: offer.id,
                  pendingOfferListingId: offer.listingId,
                  pendingOfferSellerId: offer.sellerId,
                },
              });
            }}
          />
          )
        ) : (
          <>
            {!isPending && !hasBuyerInventory && (
              <BuyerEmptyState
                onSearch={goSearch}
                onSell={openSellBikeMenu}
                onInvite={shareSellerInvite}
              />
            )}
            {registryData && (
              <>
                {bikesForSale.length > 0 && (
                  <ListingGridSection
                    title="Bikes"
                    sub="Fresh listings from builders and riders."
                    items={bikesForSale}
                    goListing={goListing}
                    onSeeAll={goBikes}
                  />
                )}
                {registryData.justListed.length > 0 && (
                  <ListingGridSection
                    title="Just listed"
                    sub="New bikes from builders and riders."
                    items={registryData.justListed}
                    goListing={goListing}
                    onSeeAll={goJustListed}
                  />
                )}
                <BuyerHero
                  imageUri={
                    bikesForSale[0]?.image || registryData.featured?.image
                  }
                  bikeCount={bikesForSale.length}
                  shopCount={shops.length}
                  onShop={goBikes}
                  onSell={openSellBikeMenu}
                />
                {registryData.under5k.length > 0 && (
                  <ListingGridSection
                    title="Under $5K"
                    sub="Good finds without collector pricing."
                    items={registryData.under5k}
                    goListing={goListing}
                    onSeeAll={goUnder5k}
                  />
                )}
                {registryData.rareFinds.length > 0 && (
                  <ListingGridSection
                    title="Rare finds"
                    sub="Harder-to-find bikes worth a closer look."
                    items={registryData.rareFinds}
                    goListing={goListing}
                  />
                )}
                {registryData.projectBikes.length > 0 && (
                  <ListingGridSection
                    title="Project bikes"
                    sub="Incomplete, imperfect, and priced to move."
                    items={registryData.projectBikes}
                    goListing={goListing}
                    onSeeAll={goProjectBikes}
                  />
                )}
                {shops.length > 0 && (
                  <ProfileRails profiles={shops} onOpenProfile={goProfile} />
                )}
                {registryData.sold.length > 0 && (
                  <SoldSection items={registryData.sold} />
                )}
              </>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={memberStatus === "approved" && requiresProfilePhoto}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => {}}
      >
        <View style={s.profileModalBackdrop}>
          <View style={s.profileSheet}>
            <View style={s.profileSheetHandle} />
            <Text style={s.profileSheetEyebrow}>Profile photo</Text>
            <Text style={s.profileSheetTitle}>Add your account photo</Text>
            <Text style={s.profileSheetBody}>
              This photo belongs to {profileCompletion.accountName || member?.name || "your account"}.
            </Text>

            <Pressable style={s.profilePhotoButton} onPress={pickProfilePhoto}>
              {profilePhoto?.uri ? (
                <Image source={{ uri: profilePhoto.uri }} style={s.profilePhotoPreview} contentFit="cover" />
              ) : (
                <Text style={s.profilePhotoText}>Add photo</Text>
              )}
            </Pressable>

            <Pressable
              style={[
                s.profileSaveButton,
                savingProfilePhoto && s.profileSaveButtonDisabled,
              ]}
              onPress={saveProfilePhoto}
              disabled={savingProfilePhoto}
            >
              {savingProfilePhoto ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={s.profileSaveText}>Save photo</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          memberStatus === "approved" && !requiresProfilePhoto && requiresGarageImage
        }
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => {}}
      >
        <View style={s.profileModalBackdrop}>
          <View style={s.profileSheet}>
            <View style={s.profileSheetHandle} />
            <Text style={s.profileSheetEyebrow}>Garage picture</Text>
            <Text style={s.profileSheetTitle}>Add your garage picture</Text>
            <Text style={s.profileSheetBody}>
              This is the public image buyers see for {garageDetails?.garageName || "your garage"}.
            </Text>

            <Pressable style={s.garagePhotoButton} onPress={pickGarageImage}>
              {garageImage?.uri ? (
                <Image source={{ uri: garageImage.uri }} style={s.profilePhotoPreview} contentFit="cover" />
              ) : (
                <Text style={s.profilePhotoText}>Add picture</Text>
              )}
            </Pressable>

            <Pressable
              style={[
                s.profileSaveButton,
                (!garageImage || savingGarageImage) && s.profileSaveButtonDisabled,
              ]}
              onPress={saveGarageImage}
              disabled={!garageImage || savingGarageImage}
            >
              {savingGarageImage ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={s.profileSaveText}>Save picture</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <ListBikeSheet ref={listBikeSheetRef} />
    </SafeAreaView>
  );
}

function BuyerHero({
  imageUri,
  bikeCount,
  shopCount,
  onShop,
  onSell,
}: {
  imageUri?: string;
  bikeCount: number;
  shopCount: number;
  onShop: () => void;
  onSell: () => void;
}) {
  return (
    <View style={s.buyerHero}>
      <View style={s.heroTopRow}>
        <View style={{ flex: 1 }}>
          <View style={s.heroToggle}>
            <Pressable style={s.heroToggleActive} onPress={onShop}>
              <Text style={s.heroToggleActiveText}>Buy</Text>
            </Pressable>
            <Pressable style={s.heroToggleInactive} onPress={onSell}>
              <Text style={s.heroToggleInactiveText}>Sell</Text>
            </Pressable>
          </View>
          <Text style={s.heroTitle}>Buy the bike.{"\n"}Make it yours.</Text>
          <Text style={s.heroBody}>
            Preloved motorcycles and builds from real sellers.
          </Text>
          <Pressable style={s.heroCta} onPress={onShop}>
            <Text style={s.heroCtaText}>Shop now</Text>
          </Pressable>
        </View>

        <View style={s.heroImageStage}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={s.heroImage}
              contentFit="cover"
            />
          ) : (
            <View style={s.heroImagePlaceholder}>
              <Text style={s.heroImagePlaceholderText}>CROIGSLIST</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.heroStats}>
        <View style={s.heroStatCard}>
          <Text style={s.heroStatValue}>{bikeCount}+</Text>
          <Text style={s.heroStatLabel}>Bikes</Text>
        </View>
        <View style={s.heroStatCard}>
          <Text style={s.heroStatValue}>New</Text>
          <Text style={s.heroStatLabel}>Listings</Text>
        </View>
        <View style={s.heroStatCard}>
          <Text style={s.heroStatValue}>{shopCount}+</Text>
          <Text style={s.heroStatLabel}>Builders</Text>
        </View>
      </View>
    </View>
  );
}

function BuyerEmptyState({
  onSearch,
  onSell,
  onInvite,
}: {
  onSearch: () => void;
  onSell: () => void;
  onInvite: () => void;
}) {
  return (
    <View style={s.buyerEmpty}>
      <Text style={s.buyerEmptyEyebrow}>Marketplace</Text>
      <Text style={s.buyerEmptyTitle}>No listings yet</Text>
      <Text style={s.buyerEmptyBody}>
        Live listings and builders will appear here after sellers publish. You can start the market by listing a bike or inviting a seller.
      </Text>
      <View style={s.buyerEmptyActions}>
        <Pressable style={s.buyerPrimaryAction} onPress={onSell}>
          <Text style={s.buyerPrimaryActionText}>SELL A BIKE</Text>
        </Pressable>
        <Pressable style={s.buyerSecondaryAction} onPress={onSearch}>
          <Text style={s.buyerSecondaryActionText}>SEARCH</Text>
        </Pressable>
      </View>
      <Pressable style={s.inviteInline} onPress={onInvite}>
        <Text style={s.inviteInlineText}>INVITE A SELLER</Text>
      </Pressable>
    </View>
  );
}

function BuilderDashboard({
  listings,
  garageDetails,
  offers,
  onCreate,
  onGarageDetails,
  onOpenListing,
  onOpenOffer,
}: {
  listings: RegistryListing[];
  garageDetails: GarageDetails | null;
  offers: ListingOffer[];
  onCreate: () => void;
  onGarageDetails: () => void;
  onOpenListing: (id: string) => void;
  onOpenOffer: (offer: ListingOffer) => void;
}) {
  const queryClient = useQueryClient();
  const offerSheetRef = useRef<BottomSheetModal>(null);
  const offerSheetSnapPoints = useMemo(() => ["54%"], []);
  const [selectedOffer, setSelectedOffer] = useState<ListingOffer | null>(null);
  const [isDenyingOffer, setIsDenyingOffer] = useState(false);
  const [denyReason, setDenyReason] = useState(DENY_REASONS[0]);
  const [customDenyReason, setCustomDenyReason] = useState("");
  const activeCount = listings.filter(
    (listing) => listing.status === "active",
  ).length;
  const soldListings = listings.filter((listing) => listing.status === "sold");
  const soldCount = soldListings.length;
  const draftCount = listings.filter(
    (listing) => listing.status === "draft",
  ).length;
  const earnings = soldListings.reduce(
    (total, listing) => total + listing.price,
    0,
  );
  const pendingOffers = offers.filter((offer) => offer.status === "pending");
  const sortedPendingOffers = [...pendingOffers].sort(
    (a, b) => b.amount - a.amount,
  );
  const hasGarageDetails = Boolean(
    garageDetails?.garageName?.trim() &&
    (garageDetails?.contactEmail?.trim() ||
      garageDetails?.phone?.trim() ||
      garageDetails?.website?.trim()),
  );
  const setupComplete = Number(hasGarageDetails) + Number(listings.length > 0);
  const renderOfferBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
      />
    ),
    [],
  );
  const openOfferSheet = useCallback((offer: ListingOffer) => {
    hapticLight();
    setSelectedOffer(offer);
    setIsDenyingOffer(false);
    setDenyReason(DENY_REASONS[0]);
    setCustomDenyReason("");
    offerSheetRef.current?.present();
  }, []);
  const closeOfferSheet = useCallback(() => {
    offerSheetRef.current?.dismiss();
  }, []);
  const handleOfferResponse = useCallback(
    async (status: "accepted" | "declined") => {
      if (!selectedOffer) return;
      hapticLight();
      const message =
        status === "accepted"
          ? `Accepted offer: ${formatUsd(selectedOffer.amount)}. Let's coordinate pickup and payment.`
          : `Declined offer: ${formatUsd(selectedOffer.amount)}. ${customDenyReason.trim() || denyReason}`;

      await respondToListingOffer({ offer: selectedOffer, status, message });
      offerSheetRef.current?.dismiss();
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["shops-tab"] });
      queryClient.invalidateQueries({ queryKey: ["search-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing-category"] });
      queryClient.invalidateQueries({ queryKey: ["listing", selectedOffer.listingId] });
      queryClient.invalidateQueries({ queryKey: ["listing-top-offer", selectedOffer.listingId] });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({
        queryKey: ["conversation-offers", selectedOffer.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["conversation-messages", selectedOffer.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["listing", selectedOffer.listingId],
      });
    },
    [customDenyReason, denyReason, queryClient, selectedOffer],
  );

  return (
    <View style={s.builderWrap}>
      {setupComplete < 2 ? (
        <View style={s.setupPanel}>
          <View style={s.setupHeader}>
            <Text style={s.setupEyebrow}>Seller setup</Text>
            <Text style={s.setupCount}>{setupComplete}/2</Text>
          </View>
          <SetupStep
            done={hasGarageDetails}
            title="Add garage contact"
            body="Name, city, and contact info buyers can trust."
            onPress={onGarageDetails}
          />
          <SetupStep
            done={listings.length > 0}
            title="Publish first listing"
            body="Add photos, price, and details for your first bike."
            onPress={onCreate}
          />
        </View>
      ) : null}

      {setupComplete === 2 ? (
        <>
          <View style={s.earningsPanel}>
            <Text style={s.earningsLabel}>Earnings</Text>
            <Text style={s.earningsValue}>{formatUsd(earnings)}</Text>
            <Text style={s.earningsSub}>
              {soldCount > 0 ? `${soldCount} sold` : "No sales yet"}
            </Text>
          </View>

          <View style={s.metricsRow}>
            <Metric label="Listings" value={listings.length} />
            <Metric label="Active" value={activeCount} />
            <Metric label="Sold" value={soldCount} />
            <Metric label="Drafts" value={draftCount} />
          </View>
        </>
      ) : null}

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>Offers</Text>
          <Text style={s.sectionSub}>
            {sortedPendingOffers.length > 0
              ? `${sortedPendingOffers.length} pending`
              : "No pending offers"}
          </Text>
        </View>
      </View>

      {sortedPendingOffers.length > 0 ? (
        sortedPendingOffers.map((offer) => (
          <Pressable
            key={offer.id}
            style={s.offerDashboardCard}
            onPress={() => openOfferSheet(offer)}
          >
            {offer.listingImage ? (
              <Image
                source={{ uri: offer.listingImage }}
                style={s.offerDashboardImage}
                contentFit="cover"
              />
            ) : (
              <View style={s.offerDashboardPlaceholder}>
                <Text style={s.offerDashboardPlaceholderText}>NO PHOTO</Text>
              </View>
            )}
            <View style={s.offerDashboardBody}>
              <Text style={s.offerDashboardLabel}>
                {offer.buyerName ?? "Buyer"}
              </Text>
              <Text style={s.offerDashboardTitle} numberOfLines={1}>
                {offer.listingTitle ?? "Listing"}
              </Text>
              <View style={s.offerDashboardBottom}>
                <Text style={s.offerDashboardAmount}>
                  {formatUsd(offer.amount)}
                </Text>
                <View style={s.statusPill}>
                  <Text style={s.statusText}>{offer.status}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))
      ) : listings.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No offers yet</Text>
          <Text style={s.emptyBody}>
            Publish a listing first. Incoming buyer offers will show here.
          </Text>
          <Pressable style={s.emptyButton} onPress={onCreate}>
            <Text style={s.emptyButtonText}>LIST YOUR FIRST BIKE</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No offers yet</Text>
          <Text style={s.emptyBody}>
            {activeCount} active{" "}
            {activeCount === 1 ? "listing is" : "listings are"} live. Top offers
            will appear here.
          </Text>
          <Pressable
            style={s.emptyButton}
            onPress={() => onOpenListing(listings[0].id)}
          >
            <Text style={s.emptyButtonText}>VIEW ACTIVE LISTING</Text>
          </Pressable>
        </View>
      )}

      <BottomSheetModal
        ref={offerSheetRef}
        snapPoints={offerSheetSnapPoints}
        backdropComponent={renderOfferBackdrop}
        enablePanDownToClose
        backgroundStyle={s.offerSheetBg}
        handleIndicatorStyle={s.offerSheetHandle}
      >
        <BottomSheetView style={s.offerSheet}>
          <Text style={s.offerSheetEyebrow}>Offer</Text>
          <Text style={s.offerSheetAmount}>
            {selectedOffer ? formatUsd(selectedOffer.amount) : ""}
          </Text>
          <Text style={s.offerSheetTitle} numberOfLines={2}>
            {selectedOffer?.listingTitle ?? "Listing"}
          </Text>
          <Text style={s.offerSheetBuyer} numberOfLines={1}>
            From {selectedOffer?.buyerName ?? "Buyer"}
          </Text>

          {isDenyingOffer ? (
            <>
              <Text style={s.denyReasonTitle}>Reason for denial</Text>
              <View style={s.denyReasonList}>
                {DENY_REASONS.map((reason) => {
                  const active =
                    denyReason === reason && !customDenyReason.trim();
                  return (
                    <Pressable
                      key={reason}
                      style={[
                        s.denyReasonOption,
                        active && s.denyReasonOptionActive,
                      ]}
                      onPress={() => {
                        setDenyReason(reason);
                        setCustomDenyReason("");
                      }}
                    >
                      <Text
                        style={[
                          s.denyReasonText,
                          active && s.denyReasonTextActive,
                        ]}
                      >
                        {reason}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={customDenyReason}
                onChangeText={setCustomDenyReason}
                placeholder="Write a different reason..."
                placeholderTextColor={COLORS.textFaint}
                style={s.denyReasonInput}
              />
              <View style={s.offerSheetActions}>
                <Pressable
                  style={s.offerSheetDeny}
                  onPress={() => setIsDenyingOffer(false)}
                >
                  <Text style={s.offerSheetDenyText}>Back</Text>
                </Pressable>
                <Pressable
                  style={s.offerSheetAccept}
                  onPress={() => handleOfferResponse("declined")}
                >
                  <Text style={s.offerSheetAcceptText}>Send denial</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={s.offerSheetActions}>
                <Pressable
                  style={s.offerSheetDeny}
                  onPress={() => setIsDenyingOffer(true)}
                >
                  <Text style={s.offerSheetDenyText}>Deny</Text>
                </Pressable>
                <Pressable
                  style={s.offerSheetAccept}
                  onPress={() => handleOfferResponse("accepted")}
                >
                  <Text style={s.offerSheetAcceptText}>Accept</Text>
                </Pressable>
              </View>
              <Pressable
                style={s.offerSheetMessage}
                onPress={() => {
                  if (!selectedOffer) return;
                  closeOfferSheet();
                  onOpenOffer(selectedOffer);
                }}
              >
                <Text style={s.offerSheetMessageText}>Message buyer</Text>
              </Pressable>
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

function SetupStep({
  done,
  title,
  body,
  onPress,
}: {
  done: boolean;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.setupStep} onPress={onPress}>
      <View style={[s.setupMark, done && s.setupMarkDone]}>
        <Text style={[s.setupMarkText, done && s.setupMarkTextDone]}>
          {done ? "✓" : ""}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.setupTitle}>{title}</Text>
        <Text style={s.setupBody}>{body}</Text>
      </View>
      <Text style={s.setupArrow}>→</Text>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

const P = SPACING.page;
const DENY_REASONS = [
  "Offer is too low",
  "Bike is no longer available",
  "I am considering other offers",
];
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
  garageLogo: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  garageLogoImage: {
    width: "100%",
    height: "100%",
  },
  garageLogoText: {
    fontSize: 17,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
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
    letterSpacing: 0,
    marginTop: -1,
  },
  roleLine: {
    fontSize: 10,
    fontFamily: F.monoMedium,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: 2,
    textTransform: "uppercase",
  },
  listBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listBtnText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.white,
  },
  buyerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: P,
    paddingTop: 8,
    paddingBottom: 14,
  },
  sellBikeButton: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: COLORS.black,
  },
  sellBikeText: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: F.monoBold,
    letterSpacing: 1,
    color: COLORS.white,
  },
  searchPill: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 22,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.white,
  },
  searchPillText: {
    fontSize: 14,
    fontFamily: F.medium,
    color: COLORS.textPrimary,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  loadingState: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  buyerHero: {
    marginTop: 56,
    borderWidth: 0,
    backgroundColor: COLORS.accent,
    paddingHorizontal: P,
    paddingTop: 16,
    paddingBottom: 14,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroToggle: {
    alignSelf: "flex-start",
    width: 126,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(36,36,36,0.16)",
    flexDirection: "row",
    padding: 3,
    marginBottom: 12,
  },
  heroToggleActive: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  heroToggleInactive: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroToggleActiveText: {
    fontSize: 13,
    fontFamily: F.bold,
    color: COLORS.accent,
  },
  heroToggleInactiveText: {
    fontSize: 13,
    fontFamily: F.bold,
    color: COLORS.white,
  },
  heroTitle: {
    fontSize: 25,
    lineHeight: 28,
    fontFamily: F.bold,
    color: COLORS.white,
    letterSpacing: 0,
  },
  heroBody: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: F.regular,
    color: COLORS.white,
    marginTop: 6,
  },
  heroCta: {
    alignSelf: "flex-start",
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 12,
  },
  heroCtaText: {
    fontSize: 14,
    fontFamily: F.bold,
    color: COLORS.accent,
  },
  heroStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.whiteA30,
    gap: 0,
    marginTop: 14,
    paddingTop: 12,
  },
  heroStatCard: {
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
  },
  heroStatValue: {
    fontSize: 15,
    lineHeight: 17,
    fontFamily: F.bold,
    color: COLORS.white,
  },
  heroStatLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontFamily: F.regular,
    color: COLORS.whiteA70,
    marginTop: 2,
  },
  heroImageStage: {
    width: 112,
    height: 112,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.black,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImagePlaceholderText: {
    fontSize: 16,
    fontFamily: F.monoBold,
    letterSpacing: 0,
    color: COLORS.white,
  },
  buyerEmpty: {
    marginHorizontal: P,
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: 18,
    backgroundColor: COLORS.surface,
  },
  buyerEmptyEyebrow: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.6,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  buyerEmptyTitle: {
    fontSize: 30,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  buyerEmptyBody: {
    fontSize: 14,
    fontFamily: F.regular,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  buyerEmptyActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  buyerPrimaryAction: {
    flex: 1,
    backgroundColor: COLORS.black,
    paddingVertical: 13,
    alignItems: "center",
  },
  buyerPrimaryActionText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.3,
    color: COLORS.white,
  },
  buyerSecondaryAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.black,
    paddingVertical: 12,
    alignItems: "center",
  },
  buyerSecondaryActionText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.3,
    color: COLORS.textPrimary,
  },
  inviteInline: {
    alignSelf: "flex-start",
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textMuted,
    paddingBottom: 2,
  },
  inviteInlineText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.3,
    color: COLORS.textSecondary,
  },
  builderWrap: {
    paddingHorizontal: P,
    paddingTop: 18,
  },
  setupPanel: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    padding: 14,
    marginBottom: 18,
  },
  setupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  setupEyebrow: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  setupCount: {
    fontSize: 10,
    fontFamily: F.monoBold,
    color: COLORS.textPrimary,
  },
  setupStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  setupMark: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  setupMarkDone: {
    backgroundColor: COLORS.black,
    borderColor: COLORS.black,
  },
  setupMarkText: {
    fontSize: 12,
    fontFamily: F.bold,
    color: COLORS.textFaint,
  },
  setupMarkTextDone: {
    color: COLORS.white,
  },
  setupTitle: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  setupBody: {
    fontSize: 12,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  setupArrow: {
    fontSize: 16,
    color: COLORS.textFaint,
  },
  earningsPanel: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 18,
    marginBottom: 18,
  },
  earningsLabel: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  earningsValue: {
    fontSize: 42,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
    marginTop: 2,
  },
  earningsSub: {
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 18,
  },
  metric: {
    minWidth: 64,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: F.monoMedium,
    letterSpacing: 0.8,
    color: COLORS.textMuted,
    marginTop: 1,
    textTransform: "uppercase",
  },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 30,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  sectionSub: {
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: 20,
    backgroundColor: COLORS.surface,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  emptyBody: {
    fontSize: 15,
    fontFamily: F.regular,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  emptyButton: {
    backgroundColor: COLORS.black,
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 18,
  },
  emptyButtonText: {
    fontSize: 11,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.white,
  },
  offerDashboardCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: COLORS.bg,
    gap: 12,
  },
  offerDashboardImage: {
    width: 74,
    height: 74,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
  },
  offerDashboardPlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceRaised,
  },
  offerDashboardPlaceholderText: {
    fontSize: 9,
    fontFamily: F.monoBold,
    color: COLORS.textFaint,
  },
  offerDashboardBody: {
    flex: 1,
  },
  offerDashboardLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: F.monoBold,
    letterSpacing: 1.1,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  offerDashboardTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  offerDashboardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
  },
  offerDashboardAmount: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  offerSheetBg: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  offerSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray300,
    marginBottom: 14,
  },
  offerSheet: {
    paddingHorizontal: P,
    paddingBottom: 34,
  },
  offerSheetEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.monoBold,
    letterSpacing: 1.4,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  offerSheetAmount: {
    fontSize: 42,
    lineHeight: 46,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  offerSheetTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  offerSheetBuyer: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    marginTop: 5,
  },
  denyReasonTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 20,
  },
  denyReasonList: {
    gap: 8,
    marginTop: 12,
  },
  denyReasonOption: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  denyReasonOptionActive: {
    borderColor: COLORS.black,
    backgroundColor: COLORS.black,
  },
  denyReasonText: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
  },
  denyReasonTextActive: {
    color: COLORS.white,
  },
  denyReasonInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    fontSize: 14,
    fontFamily: F.regular,
    color: COLORS.textPrimary,
  },
  offerSheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  offerSheetDeny: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.black,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  offerSheetDenyText: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  offerSheetAccept: {
    flex: 1,
    minHeight: 52,
    borderRadius: 6,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  offerSheetAcceptText: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.white,
  },
  offerSheetMessage: {
    minHeight: 52,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  offerSheetMessageText: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  profileModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  profileSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray300,
    marginBottom: 18,
  },
  profileSheet: {
    paddingHorizontal: SPACING.page,
    paddingTop: 10,
    paddingBottom: 34,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.white,
  },
  profileSheetEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.monoBold,
    letterSpacing: 1.4,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  profileSheetTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  profileSheetBody: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  profilePhotoButton: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: COLORS.surfaceRaised,
    marginTop: 22,
  },
  garagePhotoButton: {
    width: 104,
    height: 104,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: COLORS.surfaceRaised,
    marginTop: 22,
  },
  profilePhotoPreview: {
    width: "100%",
    height: "100%",
  },
  profilePhotoText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  profileSaveButton: {
    minHeight: 54,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.black,
    marginTop: 22,
  },
  profileSaveButtonDisabled: {
    opacity: 0.35,
  },
  profileSaveText: {
    fontSize: 15,
    fontFamily: F.bold,
    color: COLORS.white,
  },
  inventoryCard: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: 14,
    backgroundColor: COLORS.bg,
  },
  inventoryImage: {
    width: "100%",
    aspectRatio: 1.55,
    backgroundColor: COLORS.surface,
  },
  inventoryPlaceholder: {
    width: "100%",
    aspectRatio: 1.55,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  inventoryPlaceholderText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.textFaint,
  },
  inventoryBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  inventoryMeta: {
    fontSize: 10,
    fontFamily: F.monoMedium,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  inventoryName: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  inventoryPrice: {
    fontSize: 15,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  statusPill: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 1,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
});
