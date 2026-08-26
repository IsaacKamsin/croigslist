import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { COLORS, F, SPACING, TYPE } from '@/constants/design';
import { S } from '@/constants/styles';

const MEMBER_TYPES = ['RIDER', 'BUILDER', 'SHOP'] as const;

export default function ApplyScreen() {
  const router = useRouter();
  const { applyForMembership } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState<typeof MEMBER_TYPES[number]>('RIDER');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!name.trim() || !email.trim() || !city.trim()) {
      setError('Name, email, and city are required.');
      return;
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await applyForMembership({ name, email, city, type, bio });
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>← BACK</Text>
          </Pressable>

          <Text style={styles.title}>APPLY FOR{'\n'}MEMBERSHIP</Text>
          <Text style={styles.description}>
            This isn't a signup form — it's an application. $100/year. Every member is admin-reviewed. No exceptions, no fast passes.
          </Text>
          <View style={styles.divider} />

          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>CITY</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Minneapolis"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>I AM A</Text>
          <View style={styles.typeRow}>
            {MEMBER_TYPES.map((t) => (
              <Pressable
                key={t}
                style={[styles.typeChip, type === t && styles.typeChipActive]}
                onPress={() => setType(t)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    type === t && styles.typeChipTextActive,
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>TELL US ABOUT YOURSELF</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="What you ride, what you build, why you belong here."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {error !== '' && (
            <Text style={styles.error}>{error}</Text>
          )}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleApply}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
            </Text>
          </Pressable>

          <Text style={styles.footnote}>
            Membership is reviewed by admins. Payment collected upon approval.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...S.screenContainer,
    paddingHorizontal: SPACING.page,
  },
  scrollContent: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  backText: {
    ...TYPE.mono,
    fontFamily: F.monoSemiBold,
    letterSpacing: 2,
    color: COLORS.textPrimary,
  },
  title: {
    ...TYPE.pageTitle,
    marginTop: SPACING.xl,
    lineHeight: 34,
  },
  description: {
    ...TYPE.bodySmall,
    marginTop: SPACING.sm,
  },
  divider: {
    ...S.divider,
    width: '100%',
    marginVertical: SPACING.lg,
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
    marginTop: SPACING.xs,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeChip: {
    ...S.filterChip,
    flex: 1,
    borderColor: COLORS.black,
    paddingVertical: 14,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: COLORS.black,
  },
  typeChipText: {
    ...S.filterChipText,
    fontSize: 12,
    letterSpacing: 2,
    color: COLORS.textPrimary,
  },
  typeChipTextActive: S.filterChipTextActive,
  error: {
    fontSize: 12,
    fontFamily: F.monoMedium,
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  button: {
    ...S.primaryButton,
    marginTop: SPACING.xl,
  },
  buttonDisabled: S.buttonDisabled,
  buttonText: S.primaryButtonText,
  footnote: {
    ...TYPE.monoSmall,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
