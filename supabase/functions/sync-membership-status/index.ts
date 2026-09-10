const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const STRIPE_API_VERSION = "2025-06-30.basil";

type SupabaseUserResponse = {
  id?: string;
};

type ProfileResponse = {
  stripe_customer_id?: string | null;
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

function getCurrentPeriodEnd(subscription: StripeSubscription) {
  return (
    subscription.current_period_end ??
    subscription.items?.data?.[0]?.current_period_end
  );
}

async function getUser(supabaseUrl: string, anonKey: string, token: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  });

  if (!response.ok) return null;
  return await response.json() as SupabaseUserResponse;
}

async function getProfile(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  if (!response.ok) return null;
  const rows = await response.json() as ProfileResponse[];
  return rows[0] ?? null;
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
  userId: string;
  customerId?: string;
  subscription: StripeSubscription;
  currentPeriodEnd?: number;
}) {
  const body: Record<string, string | boolean | null> = {
    member_status: statusForSubscription(params.subscription),
    stripe_subscription_id: params.subscription.id,
    subscription_status: params.subscription.status ?? null,
    subscription_cancel_at_period_end: Boolean(params.subscription.cancel_at_period_end),
    subscription_current_period_end: params.currentPeriodEnd
      ? new Date(params.currentPeriodEnd * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  if (params.customerId) body.stripe_customer_id = params.customerId;

  const update = (payload: Record<string, string | boolean | null>) => fetch(
    `${params.supabaseUrl}/rest/v1/profiles?id=eq.${params.userId}`,
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

  return body.member_status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey) {
      return jsonResponse({ error: "Missing function secrets." }, 500);
    }

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return jsonResponse({ error: "Not authenticated." }, 401);

    const user = await getUser(supabaseUrl, anonKey, token);
    if (!user?.id) return jsonResponse({ error: "Not authenticated." }, 401);

    const { subscriptionId } = await req.json();
    if (typeof subscriptionId !== "string" || !subscriptionId.startsWith("sub_")) {
      return jsonResponse({ error: "subscriptionId is required." }, 400);
    }

    const [profile, subscription] = await Promise.all([
      getProfile(supabaseUrl, serviceRoleKey, user.id),
      retrieveSubscription(subscriptionId, stripeSecretKey),
    ]);
    const subscriptionCustomer =
      typeof subscription.customer === "string" ? subscription.customer : undefined;

    if (
      subscription.metadata?.supabase_user_id !== user.id &&
      (!profile?.stripe_customer_id ||
        profile.stripe_customer_id !== subscriptionCustomer)
    ) {
      return jsonResponse({ error: "Subscription does not belong to user." }, 403);
    }

    const memberStatus = await updateProfile({
      supabaseUrl,
      serviceRoleKey,
      userId: user.id,
      customerId: subscriptionCustomer,
      subscription,
      currentPeriodEnd: getCurrentPeriodEnd(subscription),
    });

    return jsonResponse({
      memberStatus,
      subscriptionStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Could not sync membership.",
      },
      500,
    );
  }
});
