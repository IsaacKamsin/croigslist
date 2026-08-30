import { assertSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatYear } from "@/lib/formatters";
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

type MemberStatus = "none" | "pending" | "approved" | "rejected";
export type MemberType = "buyer" | "builder";

interface AccountApplication {
  name?: string;
  email: string;
  password: string;
  city?: string;
  type: MemberType;
  bio?: string;
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
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  handle: string | null;
  city: string | null;
  role: MemberType | null;
  bio: string | null;
  is_verified: boolean | null;
  member_status: MemberStatus | null;
  bikes_count: number | null;
  created_at: string | null;
};

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  applyForMembership: (application: AccountApplication) => Promise<ApplyResult>;
  setActiveView: (view: MemberType) => void;
  toggleActiveView: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

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
  };
}

async function loadProfile(user: User) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, handle, city, role, bio, is_verified, member_status, bikes_count, created_at",
    )
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  return data ?? null;
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
    member_status: "approved" satisfies MemberStatus,
    is_verified: application.type === "builder",
    bikes_count: 0,
  };

  const { error } = await supabase.from("profiles").upsert(row);
  if (error) throw error;
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
      const member = memberFromProfile(session.user, profile);
      setState({
        isAuthenticated: true,
        isLoading: false,
        memberStatus: profile?.member_status ?? "approved",
        member,
        activeView: member.type,
        session,
      });
    } catch {
      const member = memberFromProfile(session.user, null);
      setState({
        isAuthenticated: true,
        isLoading: false,
        memberStatus: "approved",
        member,
        activeView: member.type,
        session,
      });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionState(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionState(session);
    });

    return () => subscription.unsubscribe();
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

  const applyForMembership = useCallback(
    async (application: AccountApplication) => {
      assertSupabaseConfigured();
      const email = application.email.trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: application.password,
        options: {
          emailRedirectTo: Linking.createURL("/(tabs)"),
          data: {
            name: application.name?.trim() || "",
            city: application.city?.trim() || "",
            type: application.type,
            bio: application.bio?.trim() || null,
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
      setActiveView,
      toggleActiveView,
    }),
    [
      state,
      signIn,
      signOut,
      applyForMembership,
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
