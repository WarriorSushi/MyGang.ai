/**
 * Google Play in-app subscription SKUs. These MUST match what's defined
 * in Google Play Console > Monetize > Subscriptions for the production
 * package name (ai.mygang.app). Internal testing uses the same SKUs.
 */
export const ANDROID_SKU = {
  basic_monthly: "mygang_basic_monthly",
  pro_monthly: "mygang_pro_monthly",
} as const;

export type AndroidSku = (typeof ANDROID_SKU)[keyof typeof ANDROID_SKU];

export const SKU_TO_TIER: Record<AndroidSku, "basic" | "pro"> = {
  [ANDROID_SKU.basic_monthly]: "basic",
  [ANDROID_SKU.pro_monthly]: "pro",
};
