import { assertSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatYear } from "@/lib/formatters";
import { getLocalProfileAvatar } from "@/lib/profile-completion-db";
import { registerForPushNotifications } from "@/lib/push-notifications";
import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type MemberStatus =
  | "none"
  | "pending"
  | "pending_payment"
  | "approved"
  | "rejected";
export type MemberType = "buyer" | "builder";

interface AccountApplication {
  name?: string;
  email: string;
  password: string;
  city?: string;
  type: MemberType;
  bio?: string;
  inviteCode: string;
}

type ApplyResult =
  | { needsEmailVerification: false }
  | { needsEmailVerification: true; email: string };

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  memberStatus: MemberStatus;
  member: Member | null;
  activeView: MemberType;
  session: Session | null;
}

interface Member {
  id: string;
  name: string;
  handle: string;
  city: string;
  isVerified: boolean;
  memberSince: string;
  type: MemberType;
  bikesCount: number;
  lookingFor?: string;
  avatarUrl?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: string;
  subscriptionCancelAtPeriodEnd?: boolean;
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  handle: string | null;
  city: string | null;
  role: MemberType | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  member_status: MemberStatus | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean | null;
  bikes_count: number | null;
  created_at: string | null;
};

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  applyForMembership: (application: AccountApplication) => Promise<ApplyResult>;
  refreshMemberProfile: () => Promise<void>;
  setActiveView: (view: MemberType) => void;
  toggleActiveView: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const PROFILE_SELECT =
  "id, full_name, handle, city, role, bio, avatar_url, is_verified, member_status, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, bikes_count, created_at";
const PROFILE_SELECT_WITHOUT_CANCEL_STATE =
  "id, full_name, handle, city, role, bio, avatar_url, is_verified, member_status, stripe_subscription_id, subscription_status, subscription_current_period_end, bikes_count, created_at";

function makeHandle(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getEffectiveMemberStatus(profile: ProfileRow | null): MemberStatus {
  if (!profile) return "pending_payment";
  const status = profile?.member_status ?? "pending_payment";
  const subscriptionStatus = profile?.subscription_status;

  if (status === "rejected") return "rejected";
  if (subscriptionStatus === "active") return "approved";
  if (subscriptionStatus === "trialing" && status === "approved") return "approved";
  if (status === "approved") return "approved";
  return status;
}

function memberFromProfile(user: User, profile: ProfileRow | null): Member {
  const metadata = user.user_metadata ?? {};
  const name =
    textOrNull(profile?.full_name) ??
    textOrNull(metadata.name) ??
    user.email?.split("@")[0] ??
    "Member";
  const type =
    profile?.role ??
    (metadata.type === "builder" || metadata.type === "buyer"
      ? metadata.type
      : "buyer");

  return {
    id: user.id,
    name,
    handle: profile?.handle ?? makeHandle(name) ?? user.id.slice(0, 8),
    city:
      profile?.city ??
      (typeof metadata.city === "string" ? metadata.city : null) ??
      "Minneapolis",
    isVerified: Boolean(profile?.is_verified),
    memberSince: formatYear(profile?.created_at ?? user.created_at),
    type,
    bikesCount: profile?.bikes_count ?? 0,
    lookingFor: type === "buyer" ? profile?.bio ?? undefined : undefined,
    avatarUrl:
      profile?.avatar_url ??
      (typeof metadata.avatar_url === "string" ? metadata.avatar_url : undefined),
    subscriptionId: profile?.stripe_subscription_id ?? undefined,
    subscriptionStatus: profile?.subscription_status ?? undefined,
    subscriptionCurrentPeriodEnd:
      profile?.subscription_current_period_end ?? undefined,
    subscriptionCancelAtPeriodEnd:
      profile?.subscription_cancel_at_period_end ?? undefined,
  };
}

async function loadProfile(user: User) {
  const result = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!result.error) return result.data ?? null;

  const fallback = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_WITHOUT_CANCEL_STATE)
    .eq("id", user.id)
    .maybeSingle<Omit<ProfileRow, "subscription_cancel_at_period_end">>();

  if (fallback.error) throw result.error;
  return fallback.data
    ? {
        ...fallback.data,
        subscription_cancel_at_period_end: false,
      }
    : null;
}

// Photos saved before profiles.avatar_url existed only reached auth metadata,
// so other users could never read them. Backfill the column once.
async function backfillProfileAvatar(user: User, profile: ProfileRow | null) {
  if (!profile || profile.avatar_url) return;

  const metadata = user.user_metadata ?? {};
  const metadataAvatar =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : "";
  if (!metadataAvatar.startsWith("http")) return;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: metadataAvatar, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.warn("Profile avatar backfill failed.", error);
    return;
  }
  profile.avatar_url = metadataAvatar;
}

async function upsertProfile(user: User, application: AccountApplication) {
  const fallbackHandle =
    makeHandle(application.name ?? "") ||
    makeHandle(application.email.split("@")[0] ?? "") ||
    user.id.slice(0, 8);
  const row = {
    id: user.id,
    full_name: application.name?.trim() || "",
    handle: fallbackHandle,
    city: application.city?.trim() || "",
    role: application.type,
    bio: application.bio?.trim() || null,
    member_status: "pending_payment" satisfies MemberStatus,
    is_verified: application.type === "builder",
    bikes_count: 0,
  };

  const { error } = await supabase.from("profiles").upsert(row);
  if (error) throw error;
}

async function validateInvite(application: AccountApplication) {
  const { data, error } = await supabase.rpc("is_invite_valid", {
    invite_code_input: application.inviteCode.trim(),
    email_input: application.email.trim(),
    role_input: application.type,
  });

  if (error) {
    throw new Error("Could not verify this invite. Try again.");
  }
  if (!data) {
    throw new Error("This invite is invalid, expired, or already used.");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    memberStatus: "none",
    member: null,
    activeView: "buyer",
    session: null,
  });

  const setSessionState = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        memberStatus: "none",
        member: null,
        activeView: "buyer",
        session: null,
      });
      return;
    }

    try {
      const profile = await loadProfile(session.user);
      await backfillProfileAvatar(session.user, profile);
      const member = memberFromProfile(session.user, profile);
      const memberStatus = getEffectiveMemberStatus(profile);
      if (!member.avatarUrl) {
        member.avatarUrl = await getLocalProfileAvatar(session.user.id) || undefined;
      }
      setState({
        isAuthenticated: true,
        isLoading: false,
        memberStatus,
        member,
        activeView: member.type,
        session,
      });
      if (memberStatus === "approved") {
        registerForPushNotifications().catch((error) => {
          console.warn(
            "Push notification setup failed.",
            error instanceof Error ? error.message : error,
          );
        });
      }
    } catch {
      const member = memberFromProfile(session.user, null);
      if (!member.avatarUrl) {
        member.avatarUrl = await getLocalProfileAvatar(session.user.id) || undefined;
      }
      setState({
        isAuthenticated: true,
        isLoading: false,
        memberStatus: "pending_payment",
        member,
        activeView: member.type,
        session,
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let loadedInitialSession = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      loadedInitialSession = true;
      setSessionState(data.session);
    }).catch(() => {
      if (!mounted) return;
      loadedInitialSession = true;
      setSessionState(null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // getSession() already delivers the initial session; once it has resolved
      // this event is a duplicate and triggers a second profile load.
      if (event === "INITIAL_SESSION" && loadedInitialSession) return;
      setSessionState(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSessionState]);

  const signIn = useCallback(async (email: string, password: string) => {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;
    await setSessionState(data.session);
  }, [setSessionState]);

  const signOut = useCallback(async () => {
    assertSupabaseConfigured();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await setSessionState(null);
  }, [setSessionState]);

  const refreshMemberProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await setSessionState(session);
  }, [setSessionState]);

  const applyForMembership = useCallback(
    async (application: AccountApplication) => {
      assertSupabaseConfigured();
      const email = application.email.trim();
      await validateInvite(application);
      const { data, error } = await supabase.auth.signUp({
        email,
        password: application.password,
        options: {
          emailRedirectTo:
            process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ??
            "croigslist://auth/callback",
          data: {
            name: application.name?.trim() || "",
            city: application.city?.trim() || "",
            type: application.type,
            bio: application.bio?.trim() || null,
            invite_code: application.inviteCode.trim(),
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Supabase did not return a user.");

      if (!data.session) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return { needsEmailVerification: true, email } satisfies ApplyResult;
      }

      await upsertProfile(data.user, application);
      await setSessionState(data.session);
      return { needsEmailVerification: false } satisfies ApplyResult;
    },
    [setSessionState],
  );

  const setActiveView = useCallback((view: MemberType) => {
    setState((prev) => ({ ...prev, activeView: view }));
  }, []);

  const toggleActiveView = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeView: prev.activeView === "builder" ? "buyer" : "builder",
    }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signOut,
      applyForMembership,
      refreshMemberProfile,
      setActiveView,
      toggleActiveView,
    }),
    [
      state,
      signIn,
      signOut,
      applyForMembership,
      refreshMemberProfile,
      setActiveView,
      toggleActiveView,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
