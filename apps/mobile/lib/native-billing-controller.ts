import type { SubscriptionTier } from "@mygang/shared";

export type PurchasableTier = Exclude<SubscriptionTier, "free">;

export type NativeBillingController = {
  purchase: (tier: PurchasableTier) => Promise<void>;
  restore: () => Promise<void>;
};

export type NativeBillingStatus = {
  busy: boolean;
  connected: boolean;
  loaded: boolean;
  prices: Partial<Record<PurchasableTier, string>>;
};

