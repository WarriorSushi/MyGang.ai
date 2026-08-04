import Constants from "expo-constants";

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

const extra = Constants.expoConfig?.extra ?? {};

export const SITE_URL = normalizeUrl(
  typeof extra.siteUrl === "string" ? extra.siteUrl : "https://mygang.ai",
);

export const API_BASE_URL = normalizeUrl(
  typeof extra.apiBaseUrl === "string"
    ? extra.apiBaseUrl
    : "https://www.mygang.ai/api",
);

export const SENTRY_DSN =
  typeof extra.sentryDsn === "string" ? extra.sentryDsn : "";

// OAuth client IDs are public identifiers. This is the web-type client ID
// already trusted by Supabase and is used as the audience for native Google
// ID tokens; it is not a client secret.
export const GOOGLE_WEB_CLIENT_ID =
  typeof extra.googleWebClientId === "string" ? extra.googleWebClientId : "";

export function apiUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}
