import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import {
  Stack,
  useGlobalSearchParams,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  MD3LightTheme,
  PaperProvider,
  configureFonts,
} from "react-native-paper";

import { COLORS, FONTS } from "@/constants/design";
import { AuthProvider, useAuth } from "@/context/AuthContext";

type NotificationData = Record<string, unknown>;

function getStringNotificationData(data: NotificationData, key: string) {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, memberStatus } = useAuth();
  const segments = useSegments();
  const { returnTo } = useGlobalSearchParams<{ returnTo?: string }>();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);
  const handledNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || isLoading || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inAuthCallback = segments[0] === "auth" && segments[1] === "callback";
    const inPayment = segments[0] === "payment";

    if (!isAuthenticated && !inAuthGroup && !inAuthCallback) {
      router.replace("/(auth)/welcome");
    } else if (isAuthenticated && memberStatus === "rejected" && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (isAuthenticated && memberStatus === "approved" && inPayment) {
      router.replace(returnTo?.startsWith("/") ? (returnTo as never) : "/(tabs)");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [
    isAuthenticated,
    isLoading,
    memberStatus,
    rootNavigationState?.key,
    returnTo,
    segments,
    isReady,
    router,
  ]);

  useEffect(() => {
    if (!isReady || isLoading || !rootNavigationState?.key || !isAuthenticated) {
      return;
    }

    const handleNotificationResponse = (
      response: Notifications.NotificationResponse | null,
    ) => {
      if (!response) return;

      const notificationId = response.notification.request.identifier;
      if (handledNotificationIdRef.current === notificationId) return;
      handledNotificationIdRef.current = notificationId;

      const data = response.notification.request.content.data as NotificationData;
      const listingId = getStringNotificationData(data, "listingId");
      if (listingId) {
        router.push({ pathname: "/listing/[id]", params: { id: listingId } });
        return;
      }

      const conversationId = getStringNotificationData(data, "conversationId");
      if (conversationId) {
        router.push({ pathname: "/messages/[id]", params: { id: conversationId } });
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    Notifications.getLastNotificationResponseAsync()
      .then(handleNotificationResponse)
      .catch((error) => {
        console.warn("Notification deep link lookup failed.", error);
      });

    return () => {
      subscription.remove();
    };
  }, [
    isAuthenticated,
    isLoading,
    isReady,
    rootNavigationState?.key,
    router,
  ]);

  return <>{children}</>;
}

/**
 * CROIGSLIST PAPER THEME
 * Mirrors your design system exactly.
 */
const fontConfig = {
  displayLarge: {
    fontFamily: FONTS.primary.bold,
  },
  displayMedium: {
    fontFamily: FONTS.primary.bold,
  },
  titleLarge: {
    fontFamily: FONTS.primary.bold,
  },
  bodyLarge: {
    fontFamily: FONTS.primary.regular,
  },
  labelLarge: {
    fontFamily: FONTS.primary.semiBold,
  },
};

const paperTheme = {
  ...MD3LightTheme,
  roundness: 2,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.black,
    background: COLORS.bg,
    surface: COLORS.surface,
    surfaceVariant: COLORS.surfaceRaised,
    onSurface: COLORS.textPrimary,
    onBackground: COLORS.textPrimary,
    outline: COLORS.divider,
    error: COLORS.error,
  },
  fonts: configureFonts({ config: fontConfig }),
};

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnMount: false,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const [fontsLoaded] = useFonts({
    "LibreFranklin-Regular": require("../assets/fonts/LibreFranklin-Regular.ttf"),
    "LibreFranklin-Medium": require("../assets/fonts/LibreFranklin-Medium.ttf"),
    "LibreFranklin-SemiBold": require("../assets/fonts/LibreFranklin-SemiBold.ttf"),
    "LibreFranklin-Bold": require("../assets/fonts/LibreFranklin-Bold.ttf"),
    "LibreFranklin-Black": require("../assets/fonts/LibreFranklin-Black.ttf"),
    "IBMPlexMono-Regular": require("../assets/fonts/IBMPlexMono-Regular.ttf"),
    "IBMPlexMono-Medium": require("../assets/fonts/IBMPlexMono-Medium.ttf"),
    "IBMPlexMono-SemiBold": require("../assets/fonts/IBMPlexMono-SemiBold.ttf"),
    "SpaceGrotesk-Regular": require("../assets/fonts/SpaceGrotesk-Regular.ttf"),
    "SpaceGrotesk-Medium": require("../assets/fonts/SpaceGrotesk-Medium.ttf"),
    "SpaceGrotesk-SemiBold": require("../assets/fonts/SpaceGrotesk-SemiBold.ttf"),
    "SpaceGrotesk-Bold": require("../assets/fonts/SpaceGrotesk-Bold.ttf"),
    "SpaceGrotesk-Light": require("../assets/fonts/SpaceGrotesk-Light.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
      >
        <StripeProvider
          publishableKey={stripePublishableKey}
          urlScheme="croigslist"
        >
          <PaperProvider theme={paperTheme}>
            <QueryClientProvider client={queryClient}>
              <BottomSheetModalProvider>
                <AuthProvider>
                  <AuthGate>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: COLORS.bg },
                    animation: "slide_from_right",
                    animationDuration: 160,
                  }}
                >
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="auth/callback" />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="payment" />

                  <Stack.Screen
                    name="listing/[id]"
                    options={{
                      headerShown: false,
                      animation: "slide_from_right",
                    }}
                  />

                  <Stack.Screen
                    name="listing/create"
                    options={{
                      presentation: "modal",
                      headerShown: true,
                      headerTitle: "",
                      headerBackTitle: "",
                      headerStyle: { backgroundColor: COLORS.bg },
                      headerTintColor: COLORS.black,
                      headerShadowVisible: false,
                    }}
                  />

                  <Stack.Screen
                    name="messages/[id]"
                    options={{
                      headerShown: false,
                      animation: "slide_from_right",
                    }}
                  />

                  <Stack.Screen
                    name="builder/[id]"
                    options={{
                      headerShown: true,
                      headerTitle: "",
                      headerBackTitle: "",
                      headerBackButtonDisplayMode: "minimal",
                      headerStyle: { backgroundColor: COLORS.bg },
                      headerTintColor: COLORS.black,
                      headerShadowVisible: false,
                      animation: "slide_from_right",
                    }}
                  />

                  <Stack.Screen
                    name="garage/details"
                    options={{
                      headerShown: true,
                      headerTitle: "",
                      headerBackTitle: "",
                      headerStyle: { backgroundColor: COLORS.bg },
                      headerTintColor: COLORS.black,
                      headerShadowVisible: false,
                      animation: "slide_from_right",
                    }}
                  />

                  <Stack.Screen
                    name="shop/[slug]"
                    options={{
                      headerShown: true,
                      headerTitle: "",
                      headerBackTitle: "",
                      headerStyle: { backgroundColor: COLORS.bg },
                      headerTintColor: COLORS.black,
                      headerShadowVisible: false,
                      animation: "slide_from_right",
                    }}
                  />
                </Stack>
                  </AuthGate>
                  <StatusBar style="dark" />
                </AuthProvider>
              </BottomSheetModalProvider>
            </QueryClientProvider>
          </PaperProvider>
        </StripeProvider>
      </View>
    </GestureHandlerRootView>
  );
}
