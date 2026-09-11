import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardScreen, keyboardScrollProps } from '@/components/KeyboardScreen';
import { MemberType, useAuth } from '@/context/AuthContext';
import { COLORS, F, SPACING, TYPE } from '@/constants/design';
import { S } from '@/constants/styles';
import { getSignupErrorMessage } from '@/lib/auth-error-messages';
import { backOrReplace } from '@/lib/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const emailFormatSchema = z.string().email();

const applySchema = z.object({
  email: z.string().trim().superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({
        code: "custom",
        message: "Email is required.",
      });
      return;
    }

    if (!emailFormatSchema.safeParse(value).success) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid email format.",
      });
    }
  }),
  password: z.string().min(1, 'Password is required.').min(6, 'Password must be at least 6 characters.'),
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
    label: 'SELLER',
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
      console.warn('Account creation failed.', e?.message ?? e);
      setError('root', { message: getSignupErrorMessage(e) });
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
              Tap the link to verify your account, then come back and sign in to
              start your 3-day trial.
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
      <KeyboardScreen style={styles.keyboard}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          {...keyboardScrollProps}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
        >
          <Pressable onPress={() => backOrReplace(router, '/(auth)/welcome')} style={styles.backBtn}>
            <Text style={styles.backText}>X</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Create account.</Text>
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
        </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...S.screenContainer,
  },
  keyboard: {
    flex: 1,
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
    marginTop: 82,
    marginBottom: SPACING.xl,
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
    fontSize: 42,
    fontFamily: F.bold,
    lineHeight: 44,
    letterSpacing: 0,
    color: COLORS.textPrimary,
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
    marginBottom: SPACING.sm,
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
