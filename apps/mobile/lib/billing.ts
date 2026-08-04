import { Platform } from "react-native";
import {
  endConnection,
  fetchProducts,
  initConnection,
  type ProductSubscription,
} from "expo-iap";
import { ANDROID_SKU, type AndroidSku } from "@mygang/shared";

import { supabase } from "./supabase";
import { apiUrl } from "./config";

const VERIFY_URL = apiUrl("billing/verify-android");

const ANDROID_SKU_LIST: string[] = Object.values(ANDROID_SKU);

/**
 * Probe whether Google Play Billing is reachable on this device. Best-effort —
 * any error (Play Store missing, dev-build without billing module, etc.) is
 * swallowed and returns false so the UI can gracefully fall back to the web
 * pricing link.
 */
export async function isBillingAvailable(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    await initConnection();
    return true;
  } catch (err) {
    console.warn("[billing] initConnection failed:", err);
    return false;
  }
}

export async function disconnectBilling(): Promise<void> {
  try {
    await endConnection();
  } catch {
    // best-effort
  }
}

/**
 * Fetch the SKU details (price, offer tokens, etc.) for our Android
 * subscription products. Returns an empty array on any failure.
 *
 * NOTE: components should generally use the `useIAP` hook's
 * `subscriptions` array instead of calling this directly. This is exposed
 * for non-React contexts (e.g., debugging, headless flows).
 */
export async function fetchAndroidSubscriptions(): Promise<ProductSubscription[]> {
  if (Platform.OS !== "android") return [];
  try {
    const result = await fetchProducts({
      skus: ANDROID_SKU_LIST,
      type: "subs",
    });
    // expo-iap returns ProductSubscription[] for type='subs', or null on
    // failure. Defensive cast handles both arrays and (unlikely) wrapped
    // shapes from older versions.
    if (Array.isArray(result)) return result as ProductSubscription[];
    return [];
  } catch (err) {
    console.warn("[billing] fetchAndroidSubscriptions failed:", err);
    return [];
  }
}

/**
 * Send the purchase token to the backend for validation. Backend hits Google
 * Play Developer API and updates profile.subscription_tier on success.
 *
 * Returns the new tier ("basic"|"pro") on success, or null on failure.
 */
export async function verifyAndroidPurchase(args: {
  purchaseToken: string;
  productId: AndroidSku;
}): Promise<"basic" | "pro" | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return null;

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[billing] verify failed:", res.status, text);
      return null;
    }
    const data = (await res.json()) as { tier?: "basic" | "pro" };
    return data.tier ?? null;
  } catch (err) {
    console.warn("[billing] verifyAndroidPurchase threw:", err);
    return null;
  }
}
