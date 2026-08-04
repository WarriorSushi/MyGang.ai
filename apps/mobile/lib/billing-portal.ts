import { Alert, Linking } from "react-native";

import { apiUrl, SITE_URL } from "./config";
import { supabase } from "./supabase";

export async function openBillingPortal(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    Alert.alert("Not signed in", "Please sign in again to manage your plan.");
    return;
  }

  try {
    const res = await fetch(apiUrl("customer-portal"), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.redirected && res.url) {
      await Linking.openURL(res.url);
      return;
    }

    const body = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };

    if (body.url) {
      await Linking.openURL(body.url);
      return;
    }

    if (!res.ok && body.error) {
      Alert.alert("Could not open plan settings", body.error);
      return;
    }

    await Linking.openURL(`${SITE_URL}/pricing`);
  } catch {
    Alert.alert(
      "Could not open plan settings",
      "Open mygang.ai/pricing in your browser, or contact support if you were billed already.",
    );
  }
}
