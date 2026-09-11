const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const STRIPE_API_VERSION = "2025-06-30.basil";

type SupabaseUserResponse = {
  id?: string;
  email?: string;
};

type ProfileResponse = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
};

type StripeCustomer = {
  id: string;
};

type StripeEphemeralKey = {
  secret: string;
};

type StripeSubscription = {
  id: string;
  status?: string;
  pending_setup_intent?: string | {
    client_secret?: string | null;
  } | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
  latest_invoice?: string | {
    id?: string;
    confirmation_secret?: {
      client_secret?: string | null;
    } | null;
    payment_intent?: string | {
      client_secret?: string | null;
    } | null;
  } | null;
};

type StripeSubscriptionList = {
  data?: StripeSubscription[];
};

type StripeInvoice = {
  confirmation_secret?: {
    client_secret?: string | null;
  } | null;
  payment_intent?: string | {
    client_secret?: string | null;
  } | null;
};

type StripePaymentIntent = {
  client_secret?: string | null;
};

type StripeSetupIntent = {
  client_secret?: string | null;
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

async function stripeRequest<T>(
  path: string,
  secretKey: string,
  body: URLSearchParams,
  headers: Record<string, string> = {},
) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
      ...headers,
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Stripe request failed.");
  }

  return data as T;
}

async function stripeGet<T>(
  path: string,
  secretKey: string,
) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Stripe request failed.");
  }

  return data as T;
}

function paymentIntentSecretFromValue(
  paymentIntent?: string | StripePaymentIntent | null,
) {
  if (!paymentIntent || typeof paymentIntent === "string") return null;
  return paymentIntent.client_secret ?? null;
}

async function getPaymentIntentClientSecret(
  subscription: StripeSubscription,
  secretKey: string,
) {
  if (
    subscription.latest_invoice &&
    typeof subscription.latest_invoice !== "string"
  ) {
    if (subscription.latest_invoice.confirmation_secret?.client_secret) {
      return subscription.latest_invoice.confirmation_secret.client_secret;
    }

    const secret = paymentIntentSecretFromValue(
      subscription.latest_invoice.payment_intent,
    );
    if (secret) return secret;

    if (typeof subscription.latest_invoice.payment_intent === "string") {
      const paymentIntent = await stripeGet<StripePaymentIntent>(
        `payment_intents/${subscription.latest_invoice.payment_intent}`,
        secretKey,
      );
      return paymentIntent.client_secret ?? null;
    }
  }

  if (typeof subscription.latest_invoice === "string") {
    const invoice = await stripeGet<StripeInvoice>(
      `invoices/${subscription.latest_invoice}?expand[]=confirmation_secret&expand[]=payment_intent`,
      secretKey,
    );
    if (invoice.confirmation_secret?.client_secret) {
      return invoice.confirmation_secret.client_secret;
    }

    const secret = paymentIntentSecretFromValue(invoice.payment_intent);
    if (secret) return secret;

    if (typeof invoice.payment_intent === "string") {
      const paymentIntent = await stripeGet<StripePaymentIntent>(
        `payment_intents/${invoice.payment_intent}`,
        secretKey,
      );
      return paymentIntent.client_secret ?? null;
    }
  }

  return null;
}

function setupIntentSecretFromValue(
  setupIntent?: string | StripeSetupIntent | null,
) {
  if (!setupIntent || typeof setupIntent === "string") return null;
  return setupIntent.client_secret ?? null;
}

async function getSetupIntentClientSecret(
  subscription: StripeSubscription,
  secretKey: string,
) {
  const secret = setupIntentSecretFromValue(subscription.pending_setup_intent);
  if (secret) return secret;

  if (typeof subscription.pending_setup_intent === "string") {
    const setupIntent = await stripeGet<StripeSetupIntent>(
      `setup_intents/${subscription.pending_setup_intent}`,
      secretKey,
    );
    return setupIntent.client_secret ?? null;
  }

  return null;
}

async function cancelIncompleteSubscription(
  subscriptionId: string,
  secretKey: string,
) {
  await stripeRequest<unknown>(
    `subscriptions/${subscriptionId}/cancel`,
    secretKey,
    new URLSearchParams(),
  ).catch(() => null);
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
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id,stripe_subscription_id,subscription_status`,
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

async function retrieveSubscription(
  subscriptionId: string,
  secretKey: string,
) {
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${subscriptionId}?expand[]=latest_invoice.confirmation_secret&expand[]=latest_invoice.payment_intent`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Stripe-Version": STRIPE_API_VERSION,
      },
    },
  );

  if (!response.ok) return null;
  return await response.json() as StripeSubscription;
}

async function cancelIncompleteSubscriptions(
  customerId: string,
  priceId: string,
  secretKey: string,
) {
  const params = new URLSearchParams({
    customer: customerId,
    status: "incomplete",
    limit: "20",
  });
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Stripe-Version": STRIPE_API_VERSION,
      },
    },
  );

  if (!response.ok) return;
  const list = await response.json() as StripeSubscriptionList;
  const matchingSubscriptions =
    list.data?.filter((subscription) =>
      subscription.items?.data?.some((item) => item.price?.id === priceId)
    ) ?? [];

  await Promise.all(
    matchingSubscriptions.map((subscription) =>
      cancelIncompleteSubscription(subscription.id, secretKey)
    ),
  );
}

async function updateStripeCustomerId(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  customerId: string,
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ stripe_customer_id: customerId }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function updatePaymentAttempt(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  customerId: string,
  subscriptionId: string,
  subscriptionStatus?: string,
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscriptionStatus ?? "incomplete",
      member_status: "pending_payment",
      updated_at: new Date().toISOString(),
    }),
  });

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_CROIGLIST_ANNUAL_PRICE_ID");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Missing Supabase function secrets." }, 500);
    }
    if (!stripeSecretKey || !priceId) {
      return jsonResponse({ error: "Missing Stripe function secrets." }, 500);
    }

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return jsonResponse({ error: "Not authenticated." }, 401);

    const user = await getUser(supabaseUrl, anonKey, token);
    if (!user?.id || !user.email) {
      return jsonResponse({ error: "Not authenticated." }, 401);
    }

    const profile = await getProfile(supabaseUrl, serviceRoleKey, user.id);
    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripeRequest<StripeCustomer>(
        "customers",
        stripeSecretKey,
        new URLSearchParams({
          email: user.email,
          "metadata[supabase_user_id]": user.id,
        }),
      );
      customerId = customer.id;
      await updateStripeCustomerId(
        supabaseUrl,
        serviceRoleKey,
        user.id,
        customerId,
      );
    }

    const ephemeralKey = await stripeRequest<StripeEphemeralKey>(
      "ephemeral_keys",
      stripeSecretKey,
      new URLSearchParams({
        customer: customerId,
      }),
      { "Stripe-Version": STRIPE_API_VERSION },
    );

    if (profile?.stripe_subscription_id && profile.subscription_status === "incomplete") {
      await cancelIncompleteSubscription(
        profile.stripe_subscription_id,
        stripeSecretKey,
      );
    }
    await cancelIncompleteSubscriptions(customerId, priceId, stripeSecretKey);

    const subscriptionParams = new URLSearchParams({
      customer: customerId,
      "items[0][price]": priceId,
      payment_behavior: "default_incomplete",
      trial_period_days: "3",
      "payment_settings[save_default_payment_method]": "on_subscription",
      "payment_settings[payment_method_types][0]": "card",
      "billing_mode[type]": "flexible",
      "trial_settings[end_behavior][missing_payment_method]": "cancel",
      "metadata[supabase_user_id]": user.id,
    });
    subscriptionParams.append("expand[]", "latest_invoice.confirmation_secret");
    subscriptionParams.append("expand[]", "pending_setup_intent");

    const subscription = await stripeRequest<StripeSubscription>(
      "subscriptions",
      stripeSecretKey,
      subscriptionParams,
    );
    const paymentIntentClientSecret = await getPaymentIntentClientSecret(
      subscription,
      stripeSecretKey,
    );
    const setupIntentClientSecret = await getSetupIntentClientSecret(
      subscription,
      stripeSecretKey,
    );

    if (!paymentIntentClientSecret && !setupIntentClientSecret) {
      return jsonResponse(
        {
          error:
            "Stripe did not return payment details for this membership.",
        },
        500,
      );
    }

    await updatePaymentAttempt(
      supabaseUrl,
      serviceRoleKey,
      user.id,
      customerId,
      subscription.id,
      subscription.status,
    );

    return jsonResponse({
      paymentIntentClientSecret,
      setupIntentClientSecret,
      customerId,
      customerEphemeralKeySecret: ephemeralKey.secret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Could not create payment sheet.",
      },
      500,
    );
  }
});
