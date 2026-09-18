import { COLORS, F, SPACING, TYPE } from "@/constants/design";
import { useAuth } from "@/context/AuthContext";
import { getCallbackErrorMessage } from "@/lib/auth-error-messages";
import { supabase } from "@/lib/supabase";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function paramsFromUrl(url: string) {
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");
  const parts: string[] = [];

  if (queryStart >= 0) {
    const queryEnd = hashStart >= 0 ? hashStart : undefined;
    parts.push(url.slice(queryStart + 1, queryEnd));
  }
  if (hashStart >= 0) {
    parts.push(url.slice(hashStart + 1));
  }

  return new URLSearchParams(parts.filter(Boolean).join("&"));
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { refreshMemberProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const url = await Linking.getInitialURL();
      if (!url) {
        router.replace("/(auth)/login");
        return;
      }

      const params = paramsFromUrl(url);
      const urlError = params.get("error_description") ?? params.get("error");
      if (urlError) throw new Error(urlError);

      const type = params.get("type");
      const code = params.get("code");
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      } else {
        throw new Error("This verification link is missing sign-in details.");
      }

      await refreshMemberProfile();
      if (!cancelled) {
        router.replace(type === "recovery" ? "/auth/reset-password" : "/(tabs)");
      }
    }

    completeAuth().catch((callbackError) => {
      if (cancelled) return;
      setError(
        getCallbackErrorMessage(callbackError),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [refreshMemberProfile, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.title}>Verification failed</Text>
            <Text style={styles.body}>{error}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator color={COLORS.black} />
            <Text style={styles.title}>Verifying email</Text>
            <Text style={styles.body}>Hang tight while we finish sign up.</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.page,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  body: {
    ...TYPE.bodySmall,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
});
