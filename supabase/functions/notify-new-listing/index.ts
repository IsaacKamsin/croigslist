const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_GARAGE_BIKES_TO_SCAN = 1000;

type NotifyListingRequest = {
  listingId?: string;
};

type SupabaseUserResponse = {
  id?: string;
};

type ListingRow = {
  id: string;
  seller_id: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  price: number | null;
  location: string | null;
  status: string | null;
  is_rare: boolean | null;
};

type GarageBikeRow = {
  owner_id: string | null;
  brand: string | null;
  model: string | null;
};

type PushTokenRow = {
  user_id: string | null;
  token: string;
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

function normalize(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function displayBike(listing: ListingRow) {
  return [listing.year, listing.make, listing.model].filter(Boolean).join(" ");
}

function isExpoPushToken(token: string) {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
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

async function fetchRows<T>(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  });

  if (!response.ok) throw new Error(await response.text());
  return await response.json() as T[];
}

function matchScore(listing: ListingRow, bike: GarageBikeRow) {
  const listingMake = normalize(listing.make);
  const listingModel = normalize(listing.model);
  const bikeBrand = normalize(bike.brand);
  const bikeModel = normalize(bike.model);

  if (!bikeBrand && !bikeModel) return 0;

  const makeMatch = Boolean(
    listingMake &&
      bikeBrand &&
      (listingMake === bikeBrand ||
        listingMake.includes(bikeBrand) ||
        bikeBrand.includes(listingMake)),
  );
  const modelMatch = Boolean(
    listingModel &&
      bikeModel &&
      (listingModel === bikeModel ||
        listingModel.includes(bikeModel) ||
        bikeModel.includes(listingModel)),
  );

  if (makeMatch && modelMatch) return 96;
  if (modelMatch) return 90;
  if (makeMatch) return 82;
  return 0;
}

async function sendExpoPush(
  tokens: string[],
  payload: {
    title: string;
    body: string;
    data: Record<string, unknown>;
  },
) {
  const uniqueTokens = [...new Set(tokens)].filter(isExpoPushToken);
  if (uniqueTokens.length === 0) return { sent: 0, tickets: [] };

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      uniqueTokens.map((token) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: "default",
      })),
    ),
  });

  const tickets = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof tickets?.errors?.[0]?.message === "string"
        ? tickets.errors[0].message
        : "Expo push request failed.",
    );
  }

  return { sent: uniqueTokens.length, tickets };
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

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Missing Supabase function secrets." }, 500);
    }

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return jsonResponse({ error: "Not authenticated." }, 401);

    const user = await getUser(supabaseUrl, anonKey, token);
    if (!user?.id) return jsonResponse({ error: "Not authenticated." }, 401);

    const payload = await req.json() as NotifyListingRequest;
    if (!payload.listingId) {
      return jsonResponse({ error: "listingId is required." }, 400);
    }

    const [listing] = await fetchRows<ListingRow>(
      supabaseUrl,
      serviceRoleKey,
      `listings?id=eq.${payload.listingId}&select=id,seller_id,year,make,model,price,location,status,is_rare&limit=1`,
    );

    if (!listing) return jsonResponse({ error: "Listing not found." }, 404);
    if (listing.seller_id !== user.id) {
      return jsonResponse({ error: "Not authorized." }, 401);
    }
    if (listing.status !== "active") {
      return jsonResponse({ sent: 0, matchedUsers: 0, freshUsers: 0 });
    }

    const [garageBikes, pushTokens] = await Promise.all([
      fetchRows<GarageBikeRow>(
        supabaseUrl,
        serviceRoleKey,
        `garage_bikes?owner_id=neq.${listing.seller_id}&analysis_status=eq.complete&select=owner_id,brand,model&limit=${MAX_GARAGE_BIKES_TO_SCAN}`,
      ),
      fetchRows<PushTokenRow>(
        supabaseUrl,
        serviceRoleKey,
        "push_tokens?enabled=eq.true&select=user_id,token",
      ),
    ]);

    const tokensByUser = new Map<string, string[]>();
    for (const row of pushTokens) {
      if (!row.user_id) continue;
      const existing = tokensByUser.get(row.user_id) ?? [];
      existing.push(row.token);
      tokensByUser.set(row.user_id, existing);
    }

    const bestMatches = new Map<string, number>();
    for (const bike of garageBikes) {
      if (!bike.owner_id || !tokensByUser.has(bike.owner_id)) continue;
      const score = matchScore(listing, bike);
      if (score === 0) continue;
      bestMatches.set(
        bike.owner_id,
        Math.max(score, bestMatches.get(bike.owner_id) ?? 0),
      );
    }

    const strongMatchUserIds = [...bestMatches.entries()]
      .filter(([, score]) => score >= 90)
      .map(([userId]) => userId);
    const matchUserIds = [...bestMatches.entries()]
      .filter(([, score]) => score < 90)
      .map(([userId]) => userId);

    const excludedFreshUsers = new Set([
      listing.seller_id,
      ...strongMatchUserIds,
      ...matchUserIds,
    ]);
    const freshUserIds = [...tokensByUser.keys()]
      .filter((userId) => !excludedFreshUsers.has(userId));

    const bikeTitle = displayBike(listing) || "A bike";
    const sends = [];

    if (strongMatchUserIds.length > 0) {
      sends.push(sendExpoPush(
        strongMatchUserIds.flatMap((userId) => tokensByUser.get(userId) ?? []),
        {
          title: "Strong match",
          body: `${bikeTitle} is live. Check it before it moves.`,
          data: {
            eventType: "strong_match",
            referenceId: listing.id,
            listingId: listing.id,
          },
        },
      ));
    }

    if (matchUserIds.length > 0) {
      sends.push(sendExpoPush(
        matchUserIds.flatMap((userId) => tokensByUser.get(userId) ?? []),
        {
          title: "Match found",
          body: `${bikeTitle} just hit the market.`,
          data: {
            eventType: "match_found",
            referenceId: listing.id,
            listingId: listing.id,
          },
        },
      ));
    }

    if (freshUserIds.length > 0) {
      sends.push(sendExpoPush(
        freshUserIds.flatMap((userId) => tokensByUser.get(userId) ?? []),
        {
          title: listing.is_rare ? "Rare find" : "Fresh listing",
          body: listing.is_rare
            ? `Rare find listed: ${bikeTitle}.`
            : `New bike just posted: ${bikeTitle}.`,
          data: {
            eventType: listing.is_rare ? "rare_find" : "fresh_listing",
            referenceId: listing.id,
            listingId: listing.id,
          },
        },
      ));
    }

    const results = await Promise.all(sends);
    const sent = results.reduce((total, result) => total + result.sent, 0);

    return jsonResponse({
      sent,
      matchedUsers: strongMatchUserIds.length + matchUserIds.length,
      freshUsers: freshUserIds.length,
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Could not notify users.",
      },
      500,
    );
  }
});
