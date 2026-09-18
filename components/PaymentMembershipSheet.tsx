import { COLORS, F, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { useAuth } from "@/context/AuthContext";
import {
  createAnnualCheckoutSession,
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
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAYMENT_UNAVAILABLE_MESSAGE =
  "We could not open checkout. Try again, or contact support if this keeps happening.";
const SUPPORT_EMAIL = "customerservice@croigslist.com";

type MembershipCheckResult = "found" | "not_found";

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
    return "Checkout is not enabled in this app build. Install the latest version and try again.";
  }

  if (
    lowerMessage.includes("missing stripe function secrets") ||
    lowerMessage.includes("missing function secrets") ||
    lowerMessage.includes("missing stripe")
  ) {
    return "Checkout is not fully set up yet. Please try again after we finish configuring payments.";
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
    return "We could not reach checkout. Check your connection and try again.";
  }

  if (
    lowerMessage.includes("card") ||
    lowerMessage.includes("payment method") ||
    lowerMessage.includes("declined")
  ) {
    return "That payment method was not accepted. Try another card.";
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
  const [checkResult, setCheckResult] = useState<MembershipCheckResult | null>(null);

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
        "Native checkout failed; opening hosted checkout.",
        checkoutError instanceof Error ? checkoutError.message : checkoutError,
      );
      try {
        await openHostedCheckout();
        setError(null);
      } catch (fallbackError) {
        console.warn(
          "Hosted checkout failed.",
          fallbackError instanceof Error ? fallbackError.message : fallbackError,
        );
        setError(
          getPaymentErrorMessage(fallbackError),
        );
      }
    } finally {
      setIsOpening(false);
      setIsRefreshing(false);
    }
  };

  const refreshStatus = async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const status = await refreshMemberProfile();
      setCheckResult(status === "approved" ? "found" : "not_found");
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

  const continueIntoApp = () => {
    setCheckResult(null);
    if (returnTo?.startsWith("/")) {
      router.replace(returnTo as never);
      return;
    }
    router.replace("/(tabs)");
  };

  const contactSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {
      Alert.alert("Contact customer service", SUPPORT_EMAIL);
    });
  };

  const startMembershipFromResult = () => {
    setCheckResult(null);
    openCheckout();
  };

  const openHostedCheckout = async () => {
    const returnParam = returnTo?.startsWith("/")
      ? `?returnTo=${encodeURIComponent(returnTo)}`
      : "";
    const checkoutUrl = await createAnnualCheckoutSession({
      successUrl: `croigslist://payment${returnParam}`,
      cancelUrl: `croigslist://payment${returnParam}`,
    });
    await Linking.openURL(checkoutUrl);
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

      <Modal
        visible={checkResult !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCheckResult(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.resultModal}>
            {checkResult === "found" ? (
              <>
                <Text style={styles.modalTitle}>Welcome back</Text>
                <Text style={styles.modalBody}>
                  We found your active Croigslist membership.
                </Text>
                <Pressable style={styles.modalPrimaryButton} onPress={continueIntoApp}>
                  <Text style={styles.modalPrimaryButtonText}>Continue into Croig</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>No subscription found</Text>
                <Text style={styles.modalBody}>
                  We could not find an active subscription for this account.
                </Text>
                <Pressable style={styles.modalPrimaryButton} onPress={startMembershipFromResult}>
                  <Text style={styles.modalPrimaryButtonText}>Start your membership</Text>
                </Pressable>
                <Pressable style={styles.modalSecondaryButton} onPress={contactSupport}>
                  <Text style={styles.modalSecondaryButtonText}>Contact @customerservice</Text>
                </Pressable>
                <Pressable
                  style={styles.modalSecondaryButton}
                  onPress={() => setCheckResult(null)}
                >
                  <Text style={styles.modalSecondaryButtonText}>Exit</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  resultModal: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: F.regular,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modalPrimaryButton: {
    ...S.primaryButton,
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
  },
  modalPrimaryButtonText: S.primaryButtonText,
  modalSecondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.xs,
  },
  modalSecondaryButtonText: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: COLORS.textMuted,
  },
});
