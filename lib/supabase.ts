import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const memoryStorage = new Map<string, string>();

const safeStorage = {
  async getItem(key: string) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string) {
    memoryStorage.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // In Expo Go or an unrebuilt native app, AsyncStorage may not be linked.
    }
  },
  async removeItem(key: string) {
    memoryStorage.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // In-memory fallback is already cleared.
    }
  },
};

export const supabase = createClient(
  supabaseUrl ?? "https://example.supabase.co",
  supabaseAnonKey ?? "missing-anon-key",
  {
    auth: {
      storage: safeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}
