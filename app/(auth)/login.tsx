import { COLORS, F, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { KeyboardScreen, keyboardScrollProps } from "@/components/KeyboardScreen";
import { useAuth } from "@/context/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-error-messages";
import { backOrReplace } from "@/lib/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
const resetEmailSchema = z.string().trim().email("Enter a valid email address first.");

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { sendPasswordReset, signIn } = useAuth();
  const [isSendingReset, setIsSendingReset] = useState(false);
  const {
    control,
    getValues,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleLogin = async (values: LoginForm) => {
    try {
      await signIn(values.email, values.password);
    } catch (e: any) {
      console.warn("Login failed.", e?.message ?? e);
      setError("root", {
        message: getAuthErrorMessage(e),
      });
    }
  };

  const handleForgotPassword = async () => {
    const emailResult = resetEmailSchema.safeParse(getValues("email"));
    if (!emailResult.success) {
      setError("email", { message: emailResult.error.issues[0]?.message });
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordReset(emailResult.data);
      Alert.alert(
        "Check your email",
        "We sent a password reset link. Open it on this device to choose a new password.",
      );
    } catch (error) {
      console.warn("Password reset failed.", error);
      setError("root", {
        message: getAuthErrorMessage(error),
      });
    } finally {
      setIsSendingReset(false);
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
        {/* Back */}
        <Pressable
          onPress={() => backOrReplace(router, "/(auth)/welcome")}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Text style={styles.backText}>X</Text>
        </Pressable>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>MEMBER{"\n"}LOGIN</Text>
          <View style={styles.divider} />

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
                  autoCorrect={false}
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
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textFaint}
                  secureTextEntry
                />
              )}
            />
          </View>

          {errors.email?.message && <Text style={styles.error}>{errors.email.message}</Text>}
          {errors.password?.message && <Text style={styles.error}>{errors.password.message}</Text>}
          {errors.root?.message && <Text style={styles.error}>{errors.root.message}</Text>}

          <Pressable
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit(handleLogin)}
            disabled={isSubmitting || isSendingReset}
          >
          <Text style={styles.buttonText}>
              {isSubmitting ? "Checking..." : "Continue"}
          </Text>
          </Pressable>

          <Pressable
            style={styles.forgotBtn}
            onPress={handleForgotPassword}
            disabled={isSubmitting || isSendingReset}
          >
            <Text style={styles.forgotText}>
              {isSendingReset ? "Sending reset..." : "Forgot password?"}
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

  // Back
  backBtn: {
    paddingTop: SPACING.md,
    marginHorizontal: SPACING.page,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 36,
    lineHeight: 38,
    fontFamily: F.light,
    color: COLORS.textPrimary,
  },

  // Form
  form: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: SPACING.page,
    paddingTop: 82,
    paddingBottom: 60,
  },
  title: {
    fontSize: 48,
    fontFamily: F.bold,
    letterSpacing: 0,
    lineHeight: 52,
    color: COLORS.textPrimary,
  },
  divider: {
    display: "none",
  },

  // Fields
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

  // Button
  button: {
    ...S.primaryButton,
    marginTop: SPACING.md,
  },
  buttonDisabled: S.buttonDisabled,
  buttonText: S.primaryButtonText,

  // Forgot
  forgotBtn: {
    alignSelf: "center",
    marginTop: SPACING.lg,
  },
  forgotText: {
    fontSize: 17,
    fontFamily: F.bold,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
});
