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

export function apiUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}
