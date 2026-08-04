import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { makeDeepLink, parseSupabaseHashParams } from "./deep-links";
import { SITE_URL } from "./config";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<{
  ok: boolean;
  error?: string;
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
    return { ok: false, error: "Google sign-in was cancelled." };
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
