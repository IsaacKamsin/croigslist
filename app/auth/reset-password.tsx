import { KeyboardScreen, keyboardScrollProps } from "@/components/KeyboardScreen";
import { COLORS, F, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { useAuth } from "@/context/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-error-messages";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { refreshMemberProfile } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const handleReset = async (values: ResetForm) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) throw error;

      await refreshMemberProfile();
      router.replace("/(tabs)");
    } catch (error) {
      console.warn("Password update failed.", error);
      setError("root", { message: getAuthErrorMessage(error) });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardScreen style={styles.inner}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          {...keyboardScrollProps}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.form}>
            <Text style={styles.title}>RESET{"\n"}PASSWORD</Text>
            <Text style={styles.body}>Choose a new password for your account.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>NEW PASSWORD</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textFaint}
                    secureTextEntry
                  />
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textFaint}
                    secureTextEntry
                  />
                )}
              />
            </View>

            {errors.password?.message && <Text style={styles.error}>{errors.password.message}</Text>}
            {errors.confirmPassword?.message && <Text style={styles.error}>{errors.confirmPassword.message}</Text>}
            {errors.root?.message && <Text style={styles.error}>{errors.root.message}</Text>}

            <Pressable
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit(handleReset)}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? "Saving..." : "Save new password"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: SPACING.page,
    paddingTop: 120,
    paddingBottom: 60,
  },
  title: {
    fontSize: 48,
    fontFamily: F.bold,
    letterSpacing: 0,
    lineHeight: 52,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  field: {
    marginBottom: SPACING.lg,
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
  error: {
    fontSize: 12,
    fontFamily: F.monoMedium,
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  button: {
    ...S.primaryButton,
    marginTop: SPACING.md,
  },
  buttonDisabled: S.buttonDisabled,
  buttonText: S.primaryButtonText,
});
