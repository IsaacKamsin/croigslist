const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};
const STRIPE_API_VERSION = "2025-06-30.basil";

type StripeEvent = {
  type: string;
  data: {
    object: {
      id?: string;
      customer?: string;
      subscription?: string;
      status?: string;
      cancel_at_period_end?: boolean;
      payment_status?: string;
      current_period_end?: number;
      items?: {
        data?: Array<{
          current_period_end?: number;
        }>;
      };
      metadata?: Record<string, string | undefined>;
      lines?: {
        data?: Array<{
          subscription?: string;
        }>;
      };
    };
  };
};

type StripeSubscription = {
  id: string;
  customer?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  default_payment_method?: string | null;
  pending_setup_intent?: string | {
    status?: string;
  } | null;
  current_period_end?: number;
  items?: {
    data?: Array<{
      current_period_end?: number;
    }>;
  };
  metadata?: Record<string, string | undefined>;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function parseStripeSignature(header: string) {
  const parts = header.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts
    .filter(([key]) => key === "v1")
    .map(([, value]) => value);

  return { timestamp, signatures };
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

async function verifyStripeSignature(
  body: string,
  signatureHeader: string | null,
  webhookSecret: string,
) {
  if (!signatureHeader) return false;

  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  if (!timestamp || signatures.length === 0) return false;

  const signedPayload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = toHex(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedPayload),
    ),
  );

  return signatures.some((candidate) => timingSafeEqual(candidate, signature));
}

function hasCompletedPaymentSetup(subscription: StripeSubscription) {
  if (subscription.default_payment_method) return true;
  if (
    subscription.pending_setup_intent &&
    typeof subscription.pending_setup_intent !== "string" &&
    subscription.pending_setup_intent.status === "succeeded"
  ) {
    return true;
  }

  return false;
}

function statusForSubscription(subscription: StripeSubscription) {
  if (subscription.status === "active") return "approved";
  if (subscription.status === "trialing" && hasCompletedPaymentSetup(subscription)) {
    return "approved";
  }
  return "pending_payment";
}

function getCurrentPeriodEnd(subscription: {
  current_period_end?: number;
  items?: { data?: Array<{ current_period_end?: number }> };
}) {
  return (
    subscription.current_period_end ??
    subscription.items?.data?.[0]?.current_period_end
  );
}

async function retrieveSubscription(subscriptionId: string, secretKey: string) {
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${subscriptionId}?expand[]=pending_setup_intent`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Stripe-Version": STRIPE_API_VERSION,
      },
    },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Could not retrieve subscription.");
  }

  return data as StripeSubscription;
}

async function updateProfile(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId?: string;
  customerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;
  memberStatus: "approved" | "pending_payment";
  requireCurrentSubscriptionMatch?: boolean;
}) {
  if (!params.userId && !params.customerId) {
    throw new Error("Missing user or customer for profile update.");
  }

  const filters = [
    params.userId
      ? `id=eq.${params.userId}`
      : `stripe_customer_id=eq.${params.customerId}`,
  ];

  if (params.requireCurrentSubscriptionMatch && params.subscriptionId) {
    filters.push(`stripe_subscription_id=eq.${params.subscriptionId}`);
  }

  const body: Record<string, string | boolean | null> = {
    member_status: params.memberStatus,
    subscription_status: params.subscriptionStatus ?? null,
    subscription_cancel_at_period_end: Boolean(params.cancelAtPeriodEnd),
    subscription_current_period_end: params.currentPeriodEnd
      ? new Date(params.currentPeriodEnd * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  if (params.customerId) body.stripe_customer_id = params.customerId;
  if (params.subscriptionId) {
    body.stripe_subscription_id = params.subscriptionId;
  }
  const update = (payload: Record<string, string | boolean | null>) => fetch(
    `${params.supabaseUrl}/rest/v1/profiles?${filters.join("&")}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${params.serviceRoleKey}`,
        apikey: params.serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    },
  );

  let response = await update(body);
  if (
    !response.ok &&
    (await response.clone().text()).includes(
      "subscription_cancel_at_period_end",
    )
  ) {
    const {
      subscription_cancel_at_period_end: _cancelAtPeriodEnd,
      ...fallbackBody
    } = body;
    response = await update(fallbackBody);
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret || !stripeSecretKey) {
    return jsonResponse({ error: "Missing webhook secrets." }, 500);
  }

  const body = await req.text();
  const isVerified = await verifyStripeSignature(
    body,
    req.headers.get("stripe-signature"),
    webhookSecret,
  );

  if (!isVerified) {
    return jsonResponse({ error: "Invalid Stripe signature." }, 400);
  }

  try {
    const event = JSON.parse(body) as StripeEvent;
    const object = event.data.object;
    let userId = object.metadata?.supabase_user_id;
    const customerId =
      typeof object.customer === "string" ? object.customer : undefined;
    const objectSubscriptionId =
      typeof object.subscription === "string"
        ? object.subscription
        : object.lines?.data?.find((line) => typeof line.subscription === "string")
            ?.subscription;

    const syncSubscription = async (subscriptionId: string) => {
      const subscription = await retrieveSubscription(
        subscriptionId,
        stripeSecretKey,
      );
      userId = userId ?? subscription.metadata?.supabase_user_id;
      const subscriptionCustomer =
        typeof subscription.customer === "string"
          ? subscription.customer
          : customerId;
      const memberStatus = statusForSubscription(subscription);

      await updateProfile({
        supabaseUrl,
        serviceRoleKey,
        userId,
        customerId: subscriptionCustomer,
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: getCurrentPeriodEnd(subscription),
        memberStatus,
        requireCurrentSubscriptionMatch: memberStatus !== "approved",
      });
    };

    if (event.type === "checkout.session.completed") {
      if (object.payment_status !== "paid") {
        return jsonResponse({ received: true });
      }

      if (!objectSubscriptionId) {
        return jsonResponse({ received: true });
      }

      await syncSubscription(objectSubscriptionId);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      if (object.id) await syncSubscription(object.id);
    }

    if (
      (event.type === "invoice.paid" ||
        event.type === "invoice.payment_succeeded" ||
        event.type === "invoice.payment_failed") &&
      objectSubscriptionId
    ) {
      await syncSubscription(objectSubscriptionId);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Webhook handling failed.",
      },
      500,
    );
  }
});
