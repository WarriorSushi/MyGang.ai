import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { supabase } from "./supabase";
import { apiUrl } from "./config";

const REGISTER_URL = apiUrl("push/mobile-register");

/**
 * Request OS notification permission. Returns "granted" | "denied" | "undetermined".
 */
export async function requestNotificationPermission(): Promise<
  "granted" | "denied" | "undetermined"
> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return "granted";

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted"
    ? "granted"
    : status === "denied"
      ? "denied"
      : "undetermined";
}

/**
 * Get the current Expo Push Token if permission is granted, otherwise null.
 * Does NOT prompt for permission — call requestNotificationPermission() first.
 *
 * On Expo Go (SDK 53+), push tokens require a dev build. This will return null
 * with a console.warn in Expo Go.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("[push] not a physical device — push tokens unavailable");
    return null;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;

  // The projectId comes from app.json's expo.extra.eas.projectId once an EAS
  // project is set up. In Expo Go without an EAS project, this returns a
  // generic token that may not work for production push.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenData.data;
  } catch (err) {
    console.warn("[push] getExpoPushTokenAsync failed:", err);
    return null;
  }
}

/**
 * Register the device's push token with the backend. Idempotent (server upserts).
 */
export async function registerPushToken(token: string): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return false;

  try {
    const res = await fetch(REGISTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        expo_push_token: token,
        platform: Platform.OS === "ios" ? "ios" : "android",
        device_id: Device.modelId ?? null,
        app_version: Constants.expoConfig?.version ?? null,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[push] registerPushToken failed:", err);
    return false;
  }
}

export async function unregisterPushToken(token: string): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return false;

  try {
    const res = await fetch(REGISTER_URL, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ expo_push_token: token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Configure how foreground notifications are handled. Call this once at app start
 * (e.g. in _layout.tsx). When the app is in the foreground, we DON'T show the
 * notification banner (the user is already in the app — they see the message
 * arrive in the chat).
 */
export function configureForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}
