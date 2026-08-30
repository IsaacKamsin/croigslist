import { useFonts } from "expo-font";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  MD3LightTheme,
  PaperProvider,
  configureFonts,
} from "react-native-paper";

import { COLORS, FONTS } from "@/constants/design";
import { AuthProvider, useAuth } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || isLoading || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [
    isAuthenticated,
    isLoading,
    rootNavigationState?.key,
    segments,
    isReady,
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

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

                <Stack.Screen
                  name="listing/[id]"
                  options={{
                    headerShown: true,
                    headerTitle: "",
                    headerBackTitle: "Back",
                    headerStyle: { backgroundColor: COLORS.bg },
                    headerTintColor: COLORS.black,
                    headerShadowVisible: false,
                    animation: "fade",
                    animationDuration: 250,
                  }}
                />

                <Stack.Screen
                  name="listing/create"
                  options={{
                    presentation: "modal",
                    headerShown: true,
                    headerTitle: "",
                    headerStyle: { backgroundColor: COLORS.bg },
                    headerTintColor: COLORS.black,
                    headerShadowVisible: false,
                  }}
                />

                <Stack.Screen
                  name="builder/[id]"
                  options={{
                    headerShown: true,
                    headerTitle: "",
                    headerBackTitle: "Back",
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
                    headerBackTitle: "Back",
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
                    headerBackTitle: "Back",
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
    </GestureHandlerRootView>
  );
}
