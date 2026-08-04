import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { makeDeepLink, parseSupabaseHashParams } from "./deep-links";
import { GOOGLE_WEB_CLIENT_ID, SITE_URL } from "./config";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<{
  ok: boolean;
  error?: string;
  cancelled?: boolean;
}> {
  // Standalone Android builds use Google Play services so the account picker
  // shows accounts already present on the device. Expo Go has no native module,
  // and iOS needs its own OAuth client before it can use the same native path.
  if (Platform.OS === "android" && Constants.appOwnership !== "expo") {
    return signInWithNativeGoogle();
  }

  return signInWithBrowserGoogle();
}

async function signInWithNativeGoogle(): Promise<{
  ok: boolean;
  error?: string;
  cancelled?: boolean;
}> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    return {
      ok: false,
      error: "Google sign-in is not configured for this build.",
    };
  }

  let google:
    | typeof import("@react-native-google-signin/google-signin")
    | undefined;

  try {
    // Kept behind the standalone-build guard so the rest of the app, including
    // email sign-in, continues to work in Expo Go.
    google = require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");

    google.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });

    await google.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
    const response = await google.GoogleSignin.signIn();
    if (!google.isSuccessResponse(response)) {
      return { ok: false, cancelled: true };
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      return {
        ok: false,
        error: "Google did not return a secure sign-in token.",
      };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) {
    if (
      google?.isErrorWithCode(error) &&
      error.code === google.statusCodes.SIGN_IN_CANCELLED
    ) {
      return { ok: false, cancelled: true };
    }
    if (
      google?.isErrorWithCode(error) &&
      error.code === google.statusCodes.PLAY_SERVICES_NOT_AVAILABLE
    ) {
      return {
        ok: false,
        error: "Google Play services are unavailable or need an update.",
      };
    }

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Google sign-in could not start.",
    };
  }
}

async function signInWithBrowserGoogle(): Promise<{
  ok: boolean;
  error?: string;
  cancelled?: boolean;
}> {
  const redirectTo = makeDeepLink("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Supabase only redirects to allowlisted URLs. The production Site URL
      // is already trusted; its landing page relays the returned session hash
      // to `mygang://auth/callback`, where this auth session completes.
      redirectTo: SITE_URL,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) return { ok: false, error: error.message };
  if (!data.url) return { ok: false, error: "Google did not return a sign-in URL." };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    return { ok: false, cancelled: true };
  }

  const parsed = Linking.parse(result.url);
  const code =
    typeof parsed.queryParams?.code === "string"
      ? parsed.queryParams.code
      : undefined;
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      code,
    );
    return exchangeError
      ? { ok: false, error: exchangeError.message }
      : { ok: true };
  }

  const params = parseSupabaseHashParams(result.url);
  if (params.access_token && params.refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    return sessionError
      ? { ok: false, error: sessionError.message }
      : { ok: true };
  }

  return { ok: false, error: "Google sign-in returned an invalid callback." };
}
