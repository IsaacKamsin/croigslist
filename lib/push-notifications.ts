import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const ANDROID_CHANNEL_ID = "croigslist";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user.id;
}

export async function registerForPushNotifications() {
  if (!isSupabaseConfigured || Platform.OS === "web" || !Device.isDevice) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Croigslist",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: "#E4002B",
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let status = existingPermissions.status;

  if (status !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    status = requestedPermissions.status;
  }

  if (status !== "granted") return null;

  const projectId = getProjectId();
  if (!projectId) {
    console.warn("Push notification registration skipped: missing EAS project id.");
    return null;
  }

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const now = new Date().toISOString();

  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      enabled: true,
      last_registered_at: now,
      updated_at: now,
    },
    { onConflict: "token" },
  );

  if (error) {
    console.warn("Push notification token registration failed.", error.message);
    return null;
  }

  return token;
}

export async function disablePushToken(token: string) {
  if (!isSupabaseConfigured || !token) return;

  const { error } = await supabase
      .from("push_tokens")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("token", token);

  if (error) {
    console.warn("Push notification token disable failed.", error.message);
  }
}
