import { COLORS, F, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { useAuth } from "@/context/AuthContext";
import {
  createAnnualPaymentSheet,
  syncAnnualMembership,
} from "@/lib/payments";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useStripe } from "@stripe/stripe-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAYMENT_UNAVAILABLE_MESSAGE =
  "Payment is unavailable. Try again in a moment.";

function getPaymentErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lowerMessage = message.toLowerCase();

  if (!message) return PAYMENT_UNAVAILABLE_MESSAGE;

  if (
    lowerMessage.includes("publishable key") ||
    lowerMessage.includes("stripeprovider") ||
    lowerMessage.includes("not initialized")
  ) {
    return "Payment is not configured in this build. Install the latest build and try again.";
  }

  if (
    lowerMessage.includes("missing stripe function secrets") ||
    lowerMessage.includes("missing function secrets") ||
    lowerMessage.includes("missing stripe")
  ) {
    return "Payment is not configured on the server yet.";
  }

  if (lowerMessage.includes("not authenticated")) {
    return "Sign in again before starting membership.";
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("fetch") ||
    lowerMessage.includes("non-2xx") ||
    lowerMessage.includes("edge function")
  ) {
    return "Could not reach payment services. Check your connection and try again.";
  }

  if (
    lowerMessage.includes("card") ||
    lowerMessage.includes("payment method") ||
    lowerMessage.includes("declined")
  ) {
    return "That payment method did not work. Try another card or payment method.";
  }

  if (lowerMessage.includes("stripe")) return PAYMENT_UNAVAILABLE_MESSAGE;

  return message;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function PaymentMembershipSheet() {
  const { refreshMemberProfile, signOut } = useAuth();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["38%"], []);
  const insets = useSafeAreaInsets();
  const [isOpening, setIsOpening] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncPaidMembership = async (subscriptionId: string) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const result = await syncAnnualMembership(subscriptionId);
      if (
        result?.memberStatus === "approved" ||
        result?.subscriptionStatus === "active" ||
        result?.subscriptionStatus === "trialing"
      ) {
        return;
      }

      if (attempt < 3) await wait(750);
    }
  };

  const openCheckout = async () => {
    setError(null);
    setIsOpening(true);

    try {
      const paymentSheet = await createAnnualPaymentSheet();
      const commonParams = {
        merchantDisplayName: "Croigslist",
        customerId: paymentSheet.customerId,
        customerEphemeralKeySecret: paymentSheet.customerEphemeralKeySecret,
        returnURL: "croigslist://payment",
        primaryButtonLabel: "Start your membership",
        style: "automatic" as const,
      };
      const { error: initError } = paymentSheet.setupIntentClientSecret
        ? await initPaymentSheet({
            ...commonParams,
            setupIntentClientSecret: paymentSheet.setupIntentClientSecret,
          })
        : await initPaymentSheet({
            ...commonParams,
            paymentIntentClientSecret: paymentSheet.paymentIntentClientSecret as string,
          });

      if (initError) {
        throw new Error(initError.message);
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === "Canceled") return;
        throw new Error(presentError.message);
      }

      setIsRefreshing(true);
      await syncPaidMembership(paymentSheet.subscriptionId);
      await refreshMemberProfile();
      if (returnTo?.startsWith("/")) {
        router.replace(returnTo as never);
      }
    } catch (checkoutError) {
      console.warn(
        "Checkout failed.",
        checkoutError instanceof Error ? checkoutError.message : checkoutError,
      );
      setError(
        getPaymentErrorMessage(checkoutError),
      );
    } finally {
      setIsOpening(false);
      setIsRefreshing(false);
    }
  };

  const refreshStatus = async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      await refreshMemberProfile();
    } catch (refreshError) {
      setError(
        getPaymentErrorMessage(refreshError),
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const confirmDifferentAccount = () => {
    Alert.alert(
      "Use different account?",
      "You will be signed out and returned to sign in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: signOut,
        },
      ],
    );
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.72}
        pressBehavior="none"
        style={[props.style, styles.lightboxBackdrop]}
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
    >
      <BottomSheetView
        style={[styles.content, { paddingBottom: insets.bottom + SPACING.lg }]}
      >
        <View style={styles.priceBlock}>
          <Text style={styles.price}>
            $100<Text style={styles.period}>/year</Text>
          </Text>
          <Text style={styles.trialLabel}>3 days free</Text>
          <Text style={styles.priceSub}>Then annual access to bikes, builders, and messages.</Text>
        </View>

        {error ? (
          <View style={styles.errorNotice}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.button, isOpening && styles.buttonDisabled]}
          onPress={openCheckout}
          disabled={isOpening || isRefreshing}
        >
          <Text style={styles.buttonText}>
            {isOpening ? "Opening checkout..." : "Start your membership"}
          </Text>
        </Pressable>

        <View style={styles.utilityRow}>
          <Pressable
            style={styles.utilityAction}
            onPress={refreshStatus}
            disabled={isOpening || isRefreshing}
          >
            <Text style={styles.utilityText}>
              {isRefreshing ? "Checking..." : "Already paid?"}
            </Text>
          </Pressable>

          <Text style={styles.utilityDot}>·</Text>

          <Pressable
            style={styles.utilityAction}
            onPress={confirmDifferentAccount}
            disabled={isOpening || isRefreshing}
          >
            <Text style={styles.utilityText}>Different account</Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -14 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 24,
  },
  lightboxBackdrop: {
    backgroundColor: COLORS.black,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.gray300,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  priceBlock: {
    alignItems: "center",
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  price: {
    fontSize: 60,
    lineHeight: 66,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0,
  },
  period: {
    fontSize: 19,
    lineHeight: 26,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
  },
  priceSub: {
    maxWidth: 330,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  trialLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: F.medium,
    color: COLORS.error,
    textAlign: "center",
  },
  errorNotice: {
    borderRadius: 12,
    backgroundColor: "rgba(200,42,42,0.08)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginBottom: SPACING.md,
  },
  button: {
    ...S.primaryButton,
    minHeight: 54,
    borderRadius: 17,
  },
  buttonDisabled: S.buttonDisabled,
  buttonText: S.primaryButtonText,
  utilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: SPACING.lg,
  },
  utilityAction: {
    minHeight: 32,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  utilityText: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: COLORS.textMuted,
  },
  utilityDot: {
    fontSize: 16,
    fontFamily: F.regular,
    color: COLORS.textFaint,
  },
});
