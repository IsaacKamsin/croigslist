import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MemberType, useAuth } from '@/context/AuthContext';
import { COLORS, F, SPACING, TYPE } from '@/constants/design';
import { S } from '@/constants/styles';
import { backOrReplace } from '@/lib/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const applySchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  type: z.enum(['buyer', 'builder']),
});

type ApplyForm = z.infer<typeof applySchema>;

const MEMBER_TYPES: {
  label: string;
  value: MemberType;
}[] = [
  {
    label: 'BUYER',
    value: 'buyer',
  },
  {
    label: 'BUILDER',
    value: 'builder',
  },
];

export default function ApplyScreen() {
  const router = useRouter();
  const { applyForMembership } = useAuth();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ApplyForm>({
    resolver: zodResolver(applySchema),
    defaultValues: { email: '', password: '', type: 'buyer' },
  });

  const type = watch('type');

  const handleApply = async (values: ApplyForm) => {
    try {
      const result = await applyForMembership(values);
      if (result.needsEmailVerification) {
        setPendingEmail(result.email);
        return;
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError('root', { message: e?.message ?? 'Something went wrong. Try again.' });
    }
  };

  if (pendingEmail) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.inboxWrap}>
          <Pressable onPress={() => backOrReplace(router, '/(auth)/welcome')} style={styles.backBtn}>
            <Text style={styles.backText}>X</Text>
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, styles.progressComplete]} />
          </View>
          <View style={styles.inboxContent}>
            <Text style={styles.inboxIcon}>@</Text>
            <Text style={styles.inboxTitle}>Check your inbox</Text>
            <Text style={styles.inboxBody}>
              We sent a verification link to{" "}
              <Text style={styles.inboxEmail}>{pendingEmail}</Text>.
            </Text>
            <Text style={styles.inboxBody}>
              Tap the link to verify your account, then come back and sign in.
            </Text>
          </View>
          <Pressable
            style={styles.button}
            onPress={() => Linking.openURL(`mailto:${pendingEmail}`)}
          >
            <Text style={styles.buttonText}>Open email app</Text>
          </Pressable>
          <Pressable
            style={styles.signInLink}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.signInLinkText}>I verified, sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
          <Pressable onPress={() => backOrReplace(router, '/(auth)/welcome')} style={styles.backBtn}>
            <Text style={styles.backText}>X</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.title}>Let us set up your account.</Text>
            <Text style={styles.description}>
              Pick a view and create your login. Garage, city, and builder details come next.
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.typeRow}>
              {MEMBER_TYPES.map((memberType) => (
                <Pressable
                  key={memberType.value}
                  style={[
                    styles.typeChip,
                    type === memberType.value && styles.typeChipActive,
                  ]}
                  onPress={() => setValue('type', memberType.value, { shouldValidate: true })}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      type === memberType.value && styles.typeChipTextActive,
                    ]}
                  >
                    {memberType.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.typeHint}>
              {type === 'builder'
                ? 'Builder view starts with listings and shop tools.'
                : 'Buyer view starts with search, saves, and Garage.'}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="you@email.com"
                    placeholderTextColor={COLORS.textFaint}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="At least 6 characters"
                    placeholderTextColor={COLORS.textFaint}
                    secureTextEntry
                  />
                )}
              />
            </View>
          </View>

          {errors.email?.message && <Text style={styles.error}>{errors.email.message}</Text>}
          {errors.password?.message && <Text style={styles.error}>{errors.password.message}</Text>}
          {errors.root?.message && <Text style={styles.error}>{errors.root.message}</Text>}

          <Pressable
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit(handleApply)}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Creating...' : 'Continue'}
            </Text>
          </Pressable>

          <Text style={styles.footnote}>
            You can switch Buyer and Builder views anytime from Profile.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...S.screenContainer,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
  },
  backText: {
    fontSize: 44,
    lineHeight: 46,
    fontFamily: F.light,
    color: COLORS.textPrimary,
  },
  header: {
    marginTop: SPACING.lg,
    marginBottom: 42,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gray200,
    overflow: "hidden",
    marginBottom: 72,
  },
  progressFill: {
    width: "42%",
    height: "100%",
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  progressComplete: {
    width: "100%",
  },
  title: {
    fontSize: 48,
    fontFamily: F.bold,
    lineHeight: 52,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: 18,
    fontFamily: F.regular,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    maxWidth: 330,
  },
  panel: {
    backgroundColor: COLORS.white,
  },
  field: {
    marginTop: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontFamily: F.semibold,
    letterSpacing: 0,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  input: {
    ...S.input,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  typeChip: {
    ...S.filterChip,
    flex: 1,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: COLORS.black,
  },
  typeChipText: {
    ...S.filterChipText,
    fontSize: 17,
  },
  typeChipTextActive: S.filterChipTextActive,
  typeHint: {
    fontSize: 15,
    fontFamily: F.regular,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
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
    marginTop: SPACING.md,
  },
  inboxWrap: {
    flex: 1,
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  inboxContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 48,
  },
  inboxIcon: {
    fontSize: 58,
    fontFamily: F.bold,
    color: COLORS.accent,
    marginBottom: SPACING.lg,
  },
  inboxTitle: {
    fontSize: 40,
    lineHeight: 44,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  inboxBody: {
    ...TYPE.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.lg,
  },
  inboxEmail: {
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  signInLink: {
    alignItems: "center",
    paddingTop: SPACING.lg,
  },
  signInLinkText: {
    fontSize: 17,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
});
