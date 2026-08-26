import { COLORS, F, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      setError(e?.message ?? "Login failed. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>MEMBER{"\n"}LOGIN</Text>
          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor={COLORS.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textFaint}
              secureTextEntry
            />
          </View>

          {error !== "" && (
            <Text style={styles.error}>{error}</Text>
          )}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "VERIFYING..." : "ENTER"}
            </Text>
          </Pressable>

          <Pressable style={styles.forgotBtn}>
            <Text style={styles.forgotText}>FORGOT PASSWORD?</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.page,
  },
  inner: {
    flex: 1,
  },

  // Back
  backBtn: {
    paddingTop: SPACING.md,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 11,
    fontFamily: F.monoMedium,
    letterSpacing: 2,
    color: COLORS.textMuted,
  },

  // Form
  form: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    fontFamily: F.bold,
    letterSpacing: -0.5,
    lineHeight: 36,
    color: COLORS.textPrimary,
  },
  divider: {
    width: 32,
    height: 2,
    backgroundColor: COLORS.black,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },

  // Fields
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 9,
    fontFamily: F.monoBold,
    letterSpacing: 2,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  input: {
    ...S.input,
    borderBottomColor: COLORS.divider,
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
    fontSize: 10,
    fontFamily: F.monoMedium,
    letterSpacing: 1.5,
    color: COLORS.textFaint,
  },
});
