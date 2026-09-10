import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Directory, File, Paths } from "expo-file-system";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const memoryStorage = new Map<string, string>();
const authStorageDir = new Directory(Paths.document, "supabase-auth");
let useFileStorageOnly = false;

async function ensureAuthStorageDir() {
  if (!authStorageDir.exists) {
    authStorageDir.create({ intermediates: true, idempotent: true });
  }
}

const fileStorage = {
  async getItem(key: string) {
    await ensureAuthStorageDir();
    const file = new File(authStorageDir, `${encodeURIComponent(key)}.json`);
    if (!file.exists) return null;
    return file.text();
  },
  async setItem(key: string, value: string) {
    await ensureAuthStorageDir();
    const file = new File(authStorageDir, `${encodeURIComponent(key)}.json`);
    if (!file.exists) file.create({ intermediates: true, overwrite: true });
    file.write(value);
  },
  async removeItem(key: string) {
    await ensureAuthStorageDir();
    const file = new File(authStorageDir, `${encodeURIComponent(key)}.json`);
    if (file.exists) file.delete();
  },
};

const safeStorage = {
  async getItem(key: string) {
    if (useFileStorageOnly) {
      try {
        return (await fileStorage.getItem(key)) ?? memoryStorage.get(key) ?? null;
      } catch {
        return memoryStorage.get(key) ?? null;
      }
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch {
      useFileStorageOnly = true;
      try {
        return (await fileStorage.getItem(key)) ?? memoryStorage.get(key) ?? null;
      } catch {
        return memoryStorage.get(key) ?? null;
      }
    }
  },
  async setItem(key: string, value: string) {
    memoryStorage.set(key, value);
    if (useFileStorageOnly) {
      try {
        await fileStorage.setItem(key, value);
      } catch (fileError) {
        console.warn("Supabase auth FileSystem storage write failed; session will not persist after restart.", fileError);
      }
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      useFileStorageOnly = true;
      try {
        await fileStorage.setItem(key, value);
      } catch (fileError) {
        console.warn("Supabase auth FileSystem storage write failed; session will not persist after restart.", fileError);
      }
    }
  },
  async removeItem(key: string) {
    memoryStorage.delete(key);
    if (useFileStorageOnly) {
      try {
        await fileStorage.removeItem(key);
      } catch {
        // Memory fallback is already cleared.
      }
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch {
      useFileStorageOnly = true;
      try {
        await fileStorage.removeItem(key);
      } catch {
        // Memory fallback is already cleared.
      }
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
