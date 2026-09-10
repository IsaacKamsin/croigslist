const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SupabaseUserResponse = {
  id?: string;
  email?: string;
};

type ProfileResponse = {
  stripe_customer_id?: string | null;
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
) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Stripe request failed.");
  }

  return data as T;
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

async function updateStripeCustomerId(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  customerId: string,
) {
  await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ stripe_customer_id: customerId }),
  });
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

    const { successUrl, cancelUrl } = await req.json();
    if (typeof successUrl !== "string" || typeof cancelUrl !== "string") {
      return jsonResponse({ error: "successUrl and cancelUrl are required." }, 400);
    }

    const profile = await getProfile(supabaseUrl, serviceRoleKey, user.id);
    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripeRequest<{ id: string }>(
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

    const session = await stripeRequest<{ url: string }>(
      "checkout/sessions",
      stripeSecretKey,
      new URLSearchParams({
        mode: "subscription",
        customer: customerId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "metadata[supabase_user_id]": user.id,
        "subscription_data[metadata][supabase_user_id]": user.id,
      }),
    );

    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Could not create checkout.",
      },
      500,
    );
  }
});
