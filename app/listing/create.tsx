import { Alert, View, Text, TextInput, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '@/hooks/useHaptics';
import { importFromUrl } from '@/hooks/useMarketplaceImport';
import { COLORS, F, IMAGE_CACHE, IMAGE_PLACEHOLDER, SPACING, TYPE } from '@/constants/design';
import { S } from '@/constants/styles';
import { XIcon } from 'phosphor-react-native';
import { createListing, type ListingImageInput } from '@/lib/registry-db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const SCREEN_W = Dimensions.get('window').width;
const MAX_PHOTOS = 10;
const MIN_PHOTOS = 3;
const PHOTO_SIZE = (SCREEN_W - SPACING.page * 2 - SPACING.sm * 2) / 3;

const listingSchema = z.object({
  year: z.string().trim().min(1, 'Year is required.'),
  make: z.string().trim().min(1, 'Make is required.'),
  model: z.string().trim().min(1, 'Model is required.'),
  mileage: z.string().optional(),
  price: z.string().trim().min(1, 'Set an asking price.'),
  description: z.string().optional(),
});

type ListingForm = z.infer<typeof listingSchema>;
type ListingPhoto = Extract<ListingImageInput, { uri: string }>;
type ListingCreateMode = 'import' | 'manual' | null;
type SourceOption = {
  key: string;
  label: string;
  icon: string;
  match: (url: string) => boolean;
};

const SOURCE_OPTIONS: SourceOption[] = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: 'f',
    match: (url) => /facebook\.com|fb\.watch|m\.facebook\.com/i.test(url),
  },
  {
    key: 'craigslist',
    label: 'Craigslist',
    icon: 'cl',
    match: (url) => /craigslist\.org/i.test(url),
  },
  {
    key: 'cycle-trader',
    label: 'Cycle Trader',
    icon: 'ct',
    match: (url) => /cycletrader\.com/i.test(url),
  },
];

function sourceFromUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return null;
  return SOURCE_OPTIONS.find((source) => source.match(trimmed)) ?? {
    key: 'link',
    label: 'Link detected',
    icon: 'url',
  };
}

export default function CreateListingScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      year: '',
      make: '',
      model: '',
      mileage: '',
      price: '',
      description: '',
    },
  });
  const [rideable, setRideable] = useState(true);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [fbLink, setFbLink] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState<"idle" | "pulling" | "complete">("idle");
  const [mode, setMode] = useState<ListingCreateMode>(null);
  const isBusy = importing || isSubmitting;
  const showListingDetails = mode === 'manual' || importStep === 'complete';
  const detectedSource = sourceFromUrl(fbLink);

  const pickPhotos = async () => {
    if (isBusy || photos.length >= MAX_PHOTOS) return;
    hapticLight();
    const remaining = Math.max(1, MAX_PHOTOS - photos.length);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos Needed', 'Allow photo access to add listing photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return;

    const selected = result.assets
      .filter((asset) => asset.uri)
      .map((asset) => ({
        uri: asset.uri,
        base64: asset.base64 ?? undefined,
        mimeType: asset.mimeType ?? 'image/jpeg',
      }));
    if (selected.length === 0) return;
    setPhotos((prev) => [...prev, ...selected].slice(0, MAX_PHOTOS));
  };

  const handleImportFB = async () => {
    if (isBusy) return;
    const url = fbLink.trim();
    if (!url.startsWith('http')) {
      Alert.alert('Invalid Link', 'Paste a full URL starting with https://');
      return;
    }
    hapticMedium();
    setImporting(true);
    setImportStep("pulling");
    setError('root', { message: '' });
    try {
      const listing = await importFromUrl(url);
      hapticSuccess();
      if (listing.year) setValue('year', listing.year, { shouldValidate: true });
      if (listing.make) setValue('make', listing.make, { shouldValidate: true });
      if (listing.model) setValue('model', listing.model, { shouldValidate: true });
      if (listing.price) setValue('price', listing.price, { shouldValidate: true });
      if (listing.mileage) setValue('mileage', listing.mileage);
      if (listing.description) setValue('description', listing.description);
      if (listing.condition) setRideable(listing.condition.toLowerCase() !== 'project');
      if (listing.images.length > 0) {
        setPhotos(listing.images.slice(0, MAX_PHOTOS).map((uri) => ({ uri })));
      }
      setImportStep("complete");
      setMode('manual');
      setFbLink('');
    } catch (e: any) {
      hapticWarning();
      setImportStep("idle");
      Alert.alert('Import Failed', e?.message ?? 'Could not extract listing data. Try filling in manually.');
    } finally {
      setImporting(false);
    }
  };

  const submitListing = async (values: ListingForm) => {
    if (photos.length < MIN_PHOTOS) {
      hapticWarning();
      Alert.alert('Add Photos', `Add at least ${MIN_PHOTOS} photos before listing.`);
      return;
    }

    try {
      const listing = await createListing({
        ...values,
        condition: rideable ? 'rideable' : 'project',
        images: photos,
      });
      hapticSuccess();
      router.replace(`/listing/${listing.id}`);
    } catch (e: any) {
      hapticWarning();
      setError('root', { message: e?.message ?? 'Could not create listing.' });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sell a bike</Text>
        <Text style={styles.headerBody}>
          Start from a marketplace link or enter the bike details yourself.
        </Text>
      </View>

      <View style={styles.modeGrid}>
        <Pressable
          style={[styles.modeCard, mode === 'import' && styles.modeCardActive]}
          onPress={() => {
            hapticLight();
            setMode('import');
          }}
          disabled={isBusy}
        >
          <Text style={styles.modeTitle}>Post from a source</Text>
          <Text style={styles.modeBody}>
            Paste a Facebook, Craigslist, or Cycle Trader link and we will pull details.
          </Text>
          {mode === 'import' || importStep === 'complete' ? (
            <View style={styles.embeddedImport}>
              <View style={styles.sourceRow}>
                {(detectedSource ? [detectedSource] : SOURCE_OPTIONS).map((source) => (
                  <View
                    key={source.key}
                    style={[
                      styles.sourcePill,
                      detectedSource?.key === source.key && styles.sourcePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceIcon,
                        detectedSource?.key === source.key && styles.sourceIconActive,
                      ]}
                    >
                      {source.icon}
                    </Text>
                    <Text
                      style={[
                        styles.sourceText,
                        detectedSource?.key === source.key && styles.sourceTextActive,
                      ]}
                    >
                      {source.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.importRow}>
                <TextInput
                  style={styles.importInput}
                  value={fbLink}
                  onChangeText={(text) => {
                    setFbLink(text);
                    if (text.trim()) setMode('import');
                  }}
                  placeholder="Paste listing URL..."
                  placeholderTextColor={COLORS.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!isBusy}
                />
                <Pressable
                  style={[styles.importBtn, !fbLink.trim() && styles.importBtnDisabled]}
                  onPress={handleImportFB}
                  disabled={!fbLink.trim() || isBusy}
                >
                  <Text style={styles.importBtnText}>
                    {importing ? 'Pulling' : 'Pull'}
                  </Text>
                </Pressable>
              </View>
              {importStep !== "idle" ? (
                <View style={styles.importStatus}>
                  <View
                    style={[
                      styles.importStatusDot,
                      importStep === "complete" && styles.importStatusDotComplete,
                    ]}
                  />
                  <Text style={styles.importStatusText}>
                    {importStep === "pulling"
                      ? "Pulling listing details and photos. Keep this screen open."
                      : `${photos.length} photo${photos.length === 1 ? "" : "s"} pulled. Review the fields below.`}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </Pressable>
        <Pressable
          style={[styles.modeCard, mode === 'manual' && styles.modeCardActive]}
          onPress={() => {
            hapticLight();
            setMode('manual');
          }}
          disabled={isBusy}
        >
          <Text style={styles.modeTitle}>Enter manually</Text>
          <Text style={styles.modeBody}>
            Add photos, price, specs, and description yourself.
          </Text>
        </Pressable>
      </View>

      {showListingDetails ? (
      <>
        <Text style={styles.note}>
          All listings require admin approval before publishing.
        </Text>
        <View style={styles.divider} />

      <Text style={styles.label}>PHOTOS</Text>
      {photos.length > 0 ? (
        <View style={styles.photoGrid}>
          {photos.map((photo, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.photoThumbImg}
                contentFit="cover"
                cachePolicy={IMAGE_CACHE}
                placeholder={IMAGE_PLACEHOLDER}
              />
              <Pressable
                style={styles.photoRemove}
                onPress={() => {
                  hapticLight();
                  setPhotos((prev) => prev.filter((_, j) => j !== i));
                }}
                disabled={isBusy}
                hitSlop={8}
              >
                <XIcon color={COLORS.white} size={12} weight="bold" />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable
              style={styles.photoAddMore}
              onPress={pickPhotos}
              disabled={isBusy}
            >
              <Text style={styles.photoAddMoreText}>+</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable style={styles.photoUpload} onPress={pickPhotos} disabled={isBusy}>
          <Text style={styles.photoUploadText}>+ ADD PHOTOS</Text>
          <Text style={styles.photoUploadSubtext}>Minimum {MIN_PHOTOS}, up to {MAX_PHOTOS}</Text>
        </Pressable>
      )}

      <View style={styles.row}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>YEAR</Text>
          <Controller
            control={control}
            name="year"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="1975"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                editable={!isBusy}
              />
            )}
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>MAKE</Text>
          <Controller
            control={control}
            name="make"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Honda"
                placeholderTextColor={COLORS.textMuted}
                editable={!isBusy}
              />
            )}
          />
        </View>
      </View>

      <Text style={styles.label}>MODEL</Text>
      <Controller
        control={control}
        name="model"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="CB550"
            placeholderTextColor={COLORS.textMuted}
            editable={!isBusy}
          />
        )}
      />

      <View style={styles.row}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>MILEAGE</Text>
          <Controller
            control={control}
            name="mileage"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="23,400"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                editable={!isBusy}
              />
            )}
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>ASKING PRICE</Text>
          <Controller
            control={control}
            name="price"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="$4,200"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                editable={!isBusy}
              />
            )}
          />
        </View>
      </View>

      <Text style={styles.label}>RIDEABLE?</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleOption, rideable && styles.toggleActive]}
          onPress={() => setRideable(true)}
          disabled={isBusy}
        >
          <Text style={[styles.toggleText, rideable && styles.toggleTextActive]}>YES</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleOption, !rideable && styles.toggleActive]}
          onPress={() => setRideable(false)}
          disabled={isBusy}
        >
          <Text style={[styles.toggleText, !rideable && styles.toggleTextActive]}>NO</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>DESCRIPTION</Text>
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Condition, history, modifications, what's included."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            editable={!isBusy}
          />
        )}
      />

      {errors.year?.message && <Text style={styles.error}>{errors.year.message}</Text>}
      {errors.make?.message && <Text style={styles.error}>{errors.make.message}</Text>}
      {errors.model?.message && <Text style={styles.error}>{errors.model.message}</Text>}
      {errors.price?.message && <Text style={styles.error}>{errors.price.message}</Text>}
      {errors.root?.message && <Text style={styles.error}>{errors.root.message}</Text>}

      <Text style={styles.footnote}>
        Listings are reviewed within 24 hours.
      </Text>
      </>
      ) : null}
      </ScrollView>

      {isBusy ? (
        <View style={styles.busyOverlay}>
          <View style={styles.busyCard}>
            <Text style={styles.busyTitle}>
              {importing ? "Pulling from Facebook" : "Posting listing"}
            </Text>
            <Text style={styles.busyBody}>
              {importing
                ? "We are extracting the bike details and copying over every usable photo we can find."
                : "Saving photos and listing details."}
            </Text>
          </View>
        </View>
      ) : null}

      {showListingDetails ? (
      <View style={styles.bottomBar}>
        <Pressable style={[styles.draftButton, isBusy && styles.submitButtonDisabled]} disabled={isBusy}>
          <Text style={styles.draftButtonText}>Save to drafts</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit(submitListing)}
          disabled={isBusy}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating...' : 'Post listing'}
          </Text>
        </Pressable>
      </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  content: {
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.sm,
    paddingBottom: 132,
  },
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 38,
    lineHeight: 42,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  headerBody: {
    ...TYPE.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  modeGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modeCard: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    justifyContent: "center",
  },
  modeCardActive: {
    borderColor: COLORS.black,
    borderWidth: 2,
  },
  modeTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  modeBody: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  embeddedImport: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.md,
  },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sourcePill: {
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourcePillActive: {
    borderColor: COLORS.black,
    backgroundColor: COLORS.black,
  },
  sourceIcon: {
    minWidth: 18,
    fontSize: 12,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sourceIconActive: {
    color: COLORS.white,
  },
  sourceText: {
    fontSize: 13,
    fontFamily: F.semibold,
    color: COLORS.textSecondary,
  },
  sourceTextActive: {
    color: COLORS.white,
  },
  importRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  importInput: {
    flex: 1,
    ...S.input,
    minHeight: 48,
    borderRadius: 8,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: F.regular,
    color: COLORS.textPrimary,
  },
  importBtn: {
    backgroundColor: COLORS.black,
    borderRadius: 24,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  importBtnDisabled: {
    opacity: 0.3,
  },
  importBtnText: {
    fontSize: 14,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.white,
  },
  importStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.md,
  },
  importStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  importStatusDotComplete: {
    backgroundColor: COLORS.success,
  },
  importStatusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: F.semibold,
    color: COLORS.textSecondary,
  },
  note: {
    ...TYPE.bodySmall,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  divider: {
    ...S.divider,
    marginBottom: SPACING.lg,
  },
  label: S.formLabel,
  input: {
    ...S.input,
    marginBottom: SPACING.sm,
  },
  textArea: {
    ...S.textArea,
    minHeight: 120,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  fieldHalf: {
    flex: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photoThumb: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    overflow: "hidden",
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.overlay75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddMore: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddMoreText: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.textFaint,
  },
  photoUpload: {
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadText: {
    fontSize: 17,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  photoUploadSubtext: {
    ...TYPE.monoSmall,
    marginTop: SPACING.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  toggleOption: {
    ...S.filterChip,
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  toggleActive: S.filterChipActive,
  toggleText: {
    ...S.filterChipText,
    fontSize: 17,
  },
  toggleTextActive: S.filterChipTextActive,
  error: {
    fontSize: 12,
    fontFamily: F.monoMedium,
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 104,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: SPACING.page,
    paddingTop: 14,
    paddingBottom: 24,
  },
  draftButton: {
    ...S.secondaryButton,
    flex: 1,
    minHeight: 58,
    paddingVertical: 0,
  },
  draftButtonText: {
    ...S.secondaryButtonText,
    fontSize: 17,
  },
  submitButton: {
    ...S.primaryButton,
    flex: 1,
    minHeight: 58,
    paddingVertical: 0,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    ...S.primaryButtonText,
    fontSize: 17,
  },
  footnote: {
    ...TYPE.monoSmall,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.page,
    paddingBottom: 104,
  },
  busyCard: {
    width: "100%",
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: SPACING.lg,
    shadowColor: COLORS.black,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  busyTitle: {
    fontSize: 26,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  busyBody: {
    ...TYPE.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
});
