import { Alert, View, Text, TextInput, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '@/hooks/useHaptics';
import { importFromUrl } from '@/hooks/useMarketplaceImport';
import { COLORS, F, IMAGE_CACHE, IMAGE_PLACEHOLDER, SPACING, TYPE } from '@/constants/design';
import { S } from '@/constants/styles';
import { LinkIcon, XIcon } from 'phosphor-react-native';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_W - SPACING.page * 2 - SPACING.sm * 2) / 3;

export default function CreateListingScreen() {
  const router = useRouter();
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [mileage, setMileage] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [rideable, setRideable] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [fbLink, setFbLink] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImportFB = async () => {
    const url = fbLink.trim();
    if (!url.startsWith('http')) {
      Alert.alert('Invalid Link', 'Paste a full URL starting with https://');
      return;
    }
    hapticMedium();
    setImporting(true);
    setError('');
    try {
      const listing = await importFromUrl(url);
      hapticSuccess();
      if (listing.year) setYear(listing.year);
      if (listing.make) setMake(listing.make);
      if (listing.model) setModel(listing.model);
      if (listing.price) setPrice(listing.price);
      if (listing.mileage) setMileage(listing.mileage);
      if (listing.description) setDescription(listing.description);
      if (listing.condition) setRideable(listing.condition.toLowerCase() !== 'project');
      if (listing.images.length > 0) setPhotos(listing.images);
      setFbLink('');
    } catch (e: any) {
      hapticWarning();
      Alert.alert('Import Failed', e?.message ?? 'Could not extract listing data. Try filling in manually.');
    } finally {
      setImporting(false);
    }
  };

  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!year.trim() || !make.trim() || !model.trim()) {
      setError('Year, make, and model are required.');
      return;
    }
    if (!price.trim()) {
      setError('Set an asking price.');
      return;
    }
    setError('');
    hapticSuccess();
    Alert.alert('Submitted', 'Your listing has been submitted for review.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* FB Marketplace import */}
      <View style={styles.importSection}>
        <View style={styles.importHeader}>
          <LinkIcon color={COLORS.textPrimary} size={16} weight="bold" />
          <Text style={styles.importTitle}>IMPORT FROM LINK</Text>
        </View>
        <Text style={styles.importSub}>
          Paste a listing URL from Facebook Marketplace, Craigslist, or Cycle Trader. We'll extract the details.
        </Text>
        <View style={styles.importRow}>
          <TextInput
            style={styles.importInput}
            value={fbLink}
            onChangeText={setFbLink}
            placeholder="Paste listing URL..."
            placeholderTextColor={COLORS.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Pressable
            style={[styles.importBtn, !fbLink.trim() && styles.importBtnDisabled]}
            onPress={handleImportFB}
            disabled={!fbLink.trim() || importing}
          >
            <Text style={styles.importBtnText}>
              {importing ? '...' : 'PULL'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>OR FILL MANUALLY</Text>
        <View style={styles.orLine} />
      </View>

      <Text style={styles.note}>
        All listings require admin approval before publishing.
      </Text>
      <View style={styles.divider} />

      <Text style={styles.label}>PHOTOS</Text>
      {photos.length > 0 ? (
        <View style={styles.photoGrid}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image
                source={{ uri }}
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
                hitSlop={8}
              >
                <XIcon color={COLORS.white} size={12} weight="bold" />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={styles.photoAddMore}
            onPress={() => {/* TODO: open image picker */}}
          >
            <Text style={styles.photoAddMoreText}>+</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.photoUpload} onPress={() => {/* TODO: open image picker */}}>
          <Text style={styles.photoUploadText}>+ ADD PHOTOS</Text>
          <Text style={styles.photoUploadSubtext}>Minimum 3 required</Text>
        </Pressable>
      )}

      <View style={styles.row}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>YEAR</Text>
          <TextInput
            style={styles.input}
            value={year}
            onChangeText={setYear}
            placeholder="1975"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>MAKE</Text>
          <TextInput
            style={styles.input}
            value={make}
            onChangeText={setMake}
            placeholder="Honda"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      <Text style={styles.label}>MODEL</Text>
      <TextInput
        style={styles.input}
        value={model}
        onChangeText={setModel}
        placeholder="CB550"
        placeholderTextColor={COLORS.textMuted}
      />

      <View style={styles.row}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>MILEAGE</Text>
          <TextInput
            style={styles.input}
            value={mileage}
            onChangeText={setMileage}
            placeholder="23,400"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>ASKING PRICE</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="$4,200"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={styles.label}>RIDEABLE?</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleOption, rideable && styles.toggleActive]}
          onPress={() => setRideable(true)}
        >
          <Text style={[styles.toggleText, rideable && styles.toggleTextActive]}>YES</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleOption, !rideable && styles.toggleActive]}
          onPress={() => setRideable(false)}
        >
          <Text style={[styles.toggleText, !rideable && styles.toggleTextActive]}>NO</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>DESCRIPTION</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Condition, history, modifications, what's included."
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      {error !== '' && (
        <Text style={styles.error}>{error}</Text>
      )}

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>SUBMIT FOR REVIEW</Text>
      </Pressable>

      <Text style={styles.footnote}>
        Listings are reviewed within 24 hours.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  content: {
    paddingHorizontal: SPACING.page,
    paddingBottom: SPACING.xxl + 20,
  },
  // FB Import
  importSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  importTitle: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.textPrimary,
  },
  importSub: {
    fontSize: 12,
    fontFamily: F.regular,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginBottom: SPACING.md,
  },
  importRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  importInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.black,
    fontSize: 13,
    fontFamily: F.mono,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
  },
  importBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  importBtnDisabled: {
    opacity: 0.3,
  },
  importBtnText: {
    fontSize: 10,
    fontFamily: F.monoBold,
    letterSpacing: 1.5,
    color: COLORS.white,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  orLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: COLORS.divider,
  },
  orText: {
    fontSize: 9,
    fontFamily: F.monoMedium,
    letterSpacing: 1.5,
    color: COLORS.textFaint,
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.black,
    paddingVertical: 12,
    fontSize: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddMoreText: {
    fontSize: 24,
    fontFamily: F.bold,
    color: COLORS.textFaint,
  },
  photoUpload: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderStyle: 'dashed',
    paddingVertical: 32,
    alignItems: 'center',
  },
  photoUploadText: {
    fontSize: 13,
    fontFamily: F.bold,
    letterSpacing: 2,
    color: COLORS.textPrimary,
  },
  photoUploadSubtext: {
    ...TYPE.monoSmall,
    marginTop: SPACING.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 1,
  },
  toggleOption: {
    ...S.filterChip,
    flex: 1,
    borderColor: COLORS.gray300,
    paddingVertical: 14,
    alignItems: 'center',
  },
  toggleActive: S.filterChipActive,
  toggleText: {
    ...S.filterChipText,
    fontSize: 12,
    letterSpacing: 2,
    color: COLORS.textSecondary,
  },
  toggleTextActive: S.filterChipTextActive,
  error: {
    fontSize: 12,
    fontFamily: F.monoMedium,
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  submitButton: {
    ...S.primaryButton,
    marginTop: SPACING.xl,
  },
  submitButtonText: S.primaryButtonText,
  footnote: {
    ...TYPE.monoSmall,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
