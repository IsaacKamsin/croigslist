const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type PushTokenRow = {
  token: string;
};

type PushRequest = {
  userIds?: string[];
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  eventType?:
    | "match_found"
    | "strong_match"
    | "price_match"
    | "nearby_match"
    | "saved_bike_alert"
    | "new_message"
    | "offer_received"
    | "offer_updated"
    | "offer_accepted"
    | "offer_declined"
    | "offer_expiring"
    | "pickup_next_step"
    | "listing_activity"
    | "sold_listing"
    | "moving_fast"
    | "fresh_listing"
    | "builder_followed"
    | "followed_builder_listing"
    | "followed_builder_offer"
    | "followed_builder_sold"
    | "rare_find"
    | "price_drop"
    | "still_available"
    | "high_interest"
    | "weekend_window"
    | "last_chance";
  referenceId?: string;
};

type SupabaseUserResponse = {
  id?: string;
};

type ConversationRow = {
  owner_id: string | null;
  participant_id: string | null;
};

type OfferRow = {
  buyer_id: string | null;
  seller_id: string | null;
  listing_id?: string | null;
};

type ListingRow = {
  seller_id: string | null;
};

type BuilderFollowRow = {
  follower_id: string | null;
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

function isServiceRoleRequest(req: Request, serviceRoleKey: string) {
  const auth = req.headers.get("Authorization") ?? "";
  const apiKey = req.headers.get("apikey") ?? "";
  return auth === `Bearer ${serviceRoleKey}` || apiKey === serviceRoleKey;
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

async function fetchSingle<T>(
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
  const rows = await response.json() as T[];
  return rows[0] ?? null;
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

async function authorizeClientNotification(params: {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  token: string;
  payload: PushRequest;
  userIds: string[];
}) {
  const user = await getUser(params.supabaseUrl, params.anonKey, params.token);
  if (!user?.id) return false;

  const eventType = params.payload.eventType;
  const referenceId = params.payload.referenceId;
  const recipients = new Set(params.userIds);
  const onlySelf = params.userIds.length === 1 && recipients.has(user.id);

  if (
    eventType === "match_found" ||
    eventType === "strong_match" ||
    eventType === "price_match" ||
    eventType === "nearby_match" ||
    eventType === "saved_bike_alert" ||
    eventType === "listing_activity" ||
    eventType === "sold_listing" ||
    eventType === "moving_fast" ||
    eventType === "fresh_listing" ||
    eventType === "rare_find" ||
    eventType === "price_drop" ||
    eventType === "still_available" ||
    eventType === "high_interest" ||
    eventType === "weekend_window" ||
    eventType === "last_chance"
  ) {
    return onlySelf;
  }

  if (eventType === "new_message" && referenceId) {
    const conversation = await fetchSingle<ConversationRow>(
      params.supabaseUrl,
      params.serviceRoleKey,
      `conversations?id=eq.${referenceId}&select=owner_id,participant_id`,
    );
    if (!conversation) return false;

    const isOwner = conversation.owner_id === user.id;
    const isParticipant = conversation.participant_id === user.id;
    if (!isOwner && !isParticipant) return false;

    const expectedRecipient = isOwner
      ? conversation.participant_id
      : conversation.owner_id;
    return Boolean(
      expectedRecipient &&
      params.userIds.length === 1 &&
      recipients.has(expectedRecipient),
    );
  }

  if (
    (eventType === "offer_received" ||
      eventType === "offer_updated" ||
      eventType === "offer_accepted" ||
      eventType === "offer_declined" ||
      eventType === "offer_expiring" ||
      eventType === "pickup_next_step") &&
    referenceId
  ) {
    const offer = await fetchSingle<OfferRow>(
      params.supabaseUrl,
      params.serviceRoleKey,
      `listing_offers?id=eq.${referenceId}&select=buyer_id,seller_id`,
    );
    if (!offer) return false;

    if (eventType === "offer_received" || eventType === "offer_updated") {
      return (
        offer.buyer_id === user.id &&
        params.userIds.length === 1 &&
        recipients.has(offer.seller_id ?? "")
      );
    }

    return (
      offer.seller_id === user.id &&
      params.userIds.length === 1 &&
      recipients.has(offer.buyer_id ?? "")
    );
  }

  if (
    (eventType === "followed_builder_listing" ||
      eventType === "followed_builder_sold") &&
    referenceId
  ) {
    const listing = await fetchSingle<ListingRow>(
      params.supabaseUrl,
      params.serviceRoleKey,
      `listings?id=eq.${referenceId}&select=seller_id`,
    );
    if (!listing?.seller_id) return false;
    if (listing.seller_id !== user.id) return false;

    return recipientsAreBuilderFollowers({
      supabaseUrl: params.supabaseUrl,
      serviceRoleKey: params.serviceRoleKey,
      builderId: listing.seller_id,
      userIds: params.userIds,
    });
  }

  if (eventType === "builder_followed" && referenceId) {
    if (params.userIds.length !== 1 || !recipients.has(referenceId)) return false;
    if (referenceId === user.id) return false;

    return recipientsAreBuilderFollowers({
      supabaseUrl: params.supabaseUrl,
      serviceRoleKey: params.serviceRoleKey,
      builderId: referenceId,
      userIds: [user.id],
    });
  }

  if (eventType === "followed_builder_offer" && referenceId) {
    const offer = await fetchSingle<OfferRow>(
      params.supabaseUrl,
      params.serviceRoleKey,
      `listing_offers?id=eq.${referenceId}&select=buyer_id,seller_id,listing_id`,
    );
    if (!offer?.seller_id) return false;
    if (offer.buyer_id !== user.id && offer.seller_id !== user.id) return false;

    return recipientsAreBuilderFollowers({
      supabaseUrl: params.supabaseUrl,
      serviceRoleKey: params.serviceRoleKey,
      builderId: offer.seller_id,
      userIds: params.userIds,
    });
  }

  return false;
}

async function recipientsAreBuilderFollowers(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  builderId: string;
  userIds: string[];
}) {
  const rows = await fetchRows<BuilderFollowRow>(
    params.supabaseUrl,
    params.serviceRoleKey,
    `builder_follows?builder_id=eq.${params.builderId}&select=follower_id`,
  );
  const followerIds = new Set(
    (Array.isArray(rows) ? rows : [])
      .map((row) => row.follower_id)
      .filter(Boolean),
  );
  return params.userIds.every((userId) => followerIds.has(userId));
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

    const payload = await req.json() as PushRequest;
    const userIds = [...new Set(payload.userIds ?? [])].filter(Boolean);
    const title = payload.title?.trim();
    const body = payload.body?.trim();

    if (userIds.length === 0) {
      return jsonResponse({ error: "userIds are required." }, 400);
    }

    if (!title || !body) {
      return jsonResponse({ error: "title and body are required." }, 400);
    }

    if (!isServiceRoleRequest(req, serviceRoleKey)) {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token) return jsonResponse({ error: "Not authenticated." }, 401);
      const allowed = await authorizeClientNotification({
        supabaseUrl,
        anonKey,
        serviceRoleKey,
        token,
        payload,
        userIds,
      });
      if (!allowed) return jsonResponse({ error: "Not authorized." }, 401);
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/push_tokens?user_id=in.(${userIds.join(",")})&enabled=eq.true&select=token`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      },
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const rows = await response.json() as PushTokenRow[];
    const tokens = [...new Set(rows.map((row) => row.token))]
      .filter(isExpoPushToken);

    if (tokens.length === 0) {
      return jsonResponse({ sent: 0, tickets: [] });
    }

    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        tokens.map((token) => ({
          to: token,
          title,
          body,
          data: payload.data ?? {},
          sound: "default",
        })),
      ),
    });

    const tickets = await expoResponse.json();
    if (!expoResponse.ok) {
      throw new Error(
        typeof tickets?.errors?.[0]?.message === "string"
          ? tickets.errors[0].message
          : "Expo push request failed.",
      );
    }

    return jsonResponse({ sent: tokens.length, tickets });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Could not send notification.",
      },
      500,
    );
  }
});
