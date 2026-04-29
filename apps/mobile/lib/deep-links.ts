import * as Linking from "expo-linking";

/** The base scheme for the app, e.g. "mygang://". */
export const APP_SCHEME = "mygang";

/** Build a deep link URL for the given path. */
export function makeDeepLink(path: string): string {
  return Linking.createURL(path);
}

/** Parse the path + query params from a deep link. */
export function parseDeepLink(url: string): {
  path: string;
  params: Record<string, string>;
} {
  const parsed = Linking.parse(url);
  return {
    path: parsed.path ?? "",
    params: (parsed.queryParams ?? {}) as Record<string, string>,
  };
}

/**
 * Supabase auth deep-link URLs put parameters in the URL hash fragment, not the
 * query string. Example: mygang://reset-password#access_token=xxx&type=recovery
 * This helper extracts those params.
 */
export function parseSupabaseHashParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return {};
  const fragment = url.slice(hashIndex + 1);
  const params: Record<string, string> = {};
  for (const pair of fragment.split("&")) {
    const [key, value] = pair.split("=");
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return params;
}
