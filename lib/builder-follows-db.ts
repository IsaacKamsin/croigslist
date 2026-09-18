import { notifyBuilderFollowed } from "@/lib/notification-events";
import { registerForPushNotifications } from "@/lib/push-notifications";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type BuilderFollowRow = {
  follower_id: string;
};

type CurrentUserProfileRow = {
  full_name: string | null;
  handle: string | null;
};

export type BuilderFollowState = {
  isFollowing: boolean;
  followerCount: number;
  isAvailable: boolean;
};

function isMissingBuilderFollowsSchema(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42P01" ||
    candidate.code === "PGRST205" ||
    Boolean(candidate.message?.includes("Could not find the table")) ||
    Boolean(candidate.message?.includes("builder_follows"))
  );
}

export async function fetchBuilderFollowState(builderId?: string): Promise<BuilderFollowState> {
  if (!isSupabaseConfigured || !builderId) {
    return { isFollowing: false, followerCount: 0, isAvailable: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count, error: countError } = await supabase
    .from("builder_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("builder_id", builderId);

  if (countError) {
    if (isMissingBuilderFollowsSchema(countError)) {
      return { isFollowing: false, followerCount: 0, isAvailable: false };
    }
    throw countError;
  }

  if (!user) {
    return { isFollowing: false, followerCount: count ?? 0, isAvailable: true };
  }

  const { data: follow, error: followError } = await supabase
    .from("builder_follows")
    .select("follower_id")
    .eq("builder_id", builderId)
    .eq("follower_id", user.id)
    .maybeSingle<BuilderFollowRow>();

  if (followError) {
    if (isMissingBuilderFollowsSchema(followError)) {
      return { isFollowing: false, followerCount: count ?? 0, isAvailable: false };
    }
    throw followError;
  }

  return { isFollowing: Boolean(follow), followerCount: count ?? 0, isAvailable: true };
}

export async function followBuilder(builderId: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in to follow this builder.");
  if (user.id === builderId) throw new Error("You cannot follow yourself.");

  const { error } = await supabase
    .from("builder_follows")
    .upsert(
      { follower_id: user.id, builder_id: builderId },
      { onConflict: "follower_id,builder_id" },
    );

  if (error) {
    if (isMissingBuilderFollowsSchema(error)) {
      throw new Error("Follow is not deployed yet. Apply the builder_follows migration first.");
    }
    throw error;
  }

  registerForPushNotifications().catch((pushError) => {
    console.warn(
      "Push notification registration after follow failed.",
      pushError instanceof Error ? pushError.message : pushError,
    );
  });

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("full_name, handle")
    .eq("id", user.id)
    .maybeSingle<CurrentUserProfileRow>();

  await notifyBuilderFollowed({
    builderId,
    followerName: profile?.full_name || profile?.handle || "Someone",
  });
}

export async function unfollowBuilder(builderId: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in to manage followed builders.");

  const { error } = await supabase
    .from("builder_follows")
    .delete()
    .eq("builder_id", builderId)
    .eq("follower_id", user.id);

  if (error) {
    if (isMissingBuilderFollowsSchema(error)) {
      throw new Error("Follow is not deployed yet. Apply the builder_follows migration first.");
    }
    throw error;
  }
}

export async function fetchBuilderFollowerIds(builderId?: string) {
  if (!isSupabaseConfigured || !builderId) return [];

  const { data, error } = await supabase
    .from("builder_follows")
    .select("follower_id")
    .eq("builder_id", builderId);

  if (error) {
    if (isMissingBuilderFollowsSchema(error)) return [];
    throw error;
  }

  return Array.from(
    new Set(
      ((data ?? []) as BuilderFollowRow[])
        .map((row) => row.follower_id)
        .filter(Boolean),
    ),
  );
}
