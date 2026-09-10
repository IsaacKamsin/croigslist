import { supabase } from "@/lib/supabase";

type CheckoutResponse = {
  url?: string;
  error?: string;
};

type PaymentSheetResponse = {
  paymentIntentClientSecret?: string;
  setupIntentClientSecret?: string;
  customerId?: string;
  customerEphemeralKeySecret?: string;
  subscriptionId?: string;
  error?: string;
};

function isResponseLike(value: unknown): value is {
  json: () => Promise<CheckoutResponse>;
  text?: () => Promise<string>;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "json" in value &&
    typeof value.json === "function"
  );
}

async function getFunctionErrorMessage(error: unknown) {
  const fallback =
    error instanceof Error ? error.message : "Could not start checkout.";
  const context =
    typeof error === "object" && error && "context" in error
      ? (error.context as unknown)
      : null;

  if (!isResponseLike(context)) return fallback;

  try {
    const data = (await context.json()) as CheckoutResponse;
    return data.error ?? fallback;
  } catch {
    try {
      const text = await context.text?.();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
}

export async function createAnnualCheckoutSession(params: {
  successUrl: string;
  cancelUrl: string;
}) {
  const { data, error } = await supabase.functions.invoke<CheckoutResponse>(
    "create-checkout-session",
    {
      body: params,
    },
  );

  if (error) throw new Error(await getFunctionErrorMessage(error));
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Stripe did not return a checkout URL.");

  return data.url;
}

export async function createAnnualPaymentSheet() {
  const { data, error } = await supabase.functions.invoke<PaymentSheetResponse>(
    "create-payment-sheet",
  );

  if (error) throw new Error(await getFunctionErrorMessage(error));
  if (data?.error) throw new Error(data.error);
  if (
    (!data?.paymentIntentClientSecret && !data?.setupIntentClientSecret) ||
    !data.customerId ||
    !data.customerEphemeralKeySecret ||
    !data.subscriptionId
  ) {
    throw new Error("Stripe did not return payment sheet details.");
  }

  return {
    paymentIntentClientSecret: data.paymentIntentClientSecret,
    setupIntentClientSecret: data.setupIntentClientSecret,
    customerId: data.customerId,
    customerEphemeralKeySecret: data.customerEphemeralKeySecret,
    subscriptionId: data.subscriptionId,
  };
}

export async function syncAnnualMembership(subscriptionId: string) {
  const { data, error } = await supabase.functions.invoke<{
    memberStatus?: string;
    subscriptionStatus?: string;
    error?: string;
  }>("sync-membership-status", {
    body: { subscriptionId },
  });

  if (error) throw new Error(await getFunctionErrorMessage(error));
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function cancelAnnualMembership(subscriptionId: string) {
  const { data, error } = await supabase.functions.invoke<{
    memberStatus?: string;
    subscriptionStatus?: string;
    cancelAtPeriodEnd?: boolean;
    error?: string;
  }>("cancel-membership", {
    body: { subscriptionId },
  });

  if (error) throw new Error(await getFunctionErrorMessage(error));
  if (data?.error) throw new Error(data.error);
  return data;
}
