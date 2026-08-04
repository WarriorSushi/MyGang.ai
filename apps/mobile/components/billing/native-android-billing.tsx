import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  ErrorCode,
  getAvailablePurchases,
  useIAP,
  type ProductSubscription,
  type Purchase,
} from "expo-iap";
import {
  ANDROID_SKU,
  SKU_TO_TIER,
  type AndroidSku,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { verifyAndroidPurchase } from "../../lib/billing";
import type {
  NativeBillingController,
  NativeBillingStatus,
  PurchasableTier,
} from "../../lib/native-billing-controller";

const SKUS = Object.values(ANDROID_SKU);

type Props = {
  onControllerChange: (controller: NativeBillingController | null) => void;
  onStatusChange: (status: NativeBillingStatus) => void;
};

export default function NativeAndroidBilling({
  onControllerChange,
  onStatusChange,
}: Props) {
  const { user, applyProfilePatch, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const processingTokens = useRef(new Set<string>());
  const processPurchaseRef = useRef<
    (purchase: Purchase, restoring: boolean) => Promise<boolean>
  >(async () => false);

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    reconnect,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void processPurchaseRef.current(purchase, false);
    },
    onPurchaseError: (error) => {
      handlePurchaseError(error);
    },
    onError: (error) => {
      console.warn("[billing] Play Billing error:", error);
    },
  });

  useEffect(() => {
    let cancelled = false;
    if (!connected) {
      setLoaded(false);
      return () => {
        cancelled = true;
      };
    }
    void fetchProducts({ skus: SKUS, type: "subs" }).finally(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [connected, fetchProducts]);

  const productsByTier = useMemo(() => {
    const result: Partial<Record<PurchasableTier, ProductSubscription>> = {};
    for (const subscription of subscriptions) {
      const tier = SKU_TO_TIER[subscription.id as AndroidSku];
      if (tier) result[tier] = subscription;
    }
    return result;
  }, [subscriptions]);

  const prices = useMemo<NativeBillingStatus["prices"]>(
    () => ({
      basic: productsByTier.basic?.displayPrice,
      pro: productsByTier.pro?.displayPrice,
    }),
    [productsByTier],
  );

  function handlePurchaseError(error: { code?: string; message?: string }) {
    setBusy(false);
    if (error.code === ErrorCode.UserCancelled) return;
    Alert.alert(
      "Purchase didn't finish",
      error.message || "Google Play could not complete the purchase. Try again.",
    );
  }

  const processPurchase = useCallback(async (purchase: Purchase, restoring: boolean) => {
    const token = purchase.purchaseToken;
    const productId = purchase.productId as AndroidSku;
    const tier = SKU_TO_TIER[productId];

    if (purchase.purchaseState === "pending") {
      setBusy(false);
      Alert.alert(
        "Purchase pending",
        "Google Play is still processing this purchase. Your plan will unlock after payment is confirmed.",
      );
      return false;
    }
    if (!token || !tier || purchase.purchaseState !== "purchased") return false;
    if (processingTokens.current.has(token)) return false;

    processingTokens.current.add(token);
    try {
      const verification = await verifyAndroidPurchase({
        purchaseToken: token,
        productId,
      });
      if (!verification) {
        Alert.alert(
          "Purchase needs verification",
          "Google Play completed the payment, but MyGang couldn't verify it yet. Use Restore purchases in a moment—do not buy it again.",
        );
        return false;
      }

      if (!verification.acknowledged) {
        await finishTransaction({ purchase, isConsumable: false });
      }
      applyProfilePatch({ subscription_tier: verification.tier });
      void refreshProfile();
      if (!restoring) {
        Alert.alert(
          `${verification.tier === "pro" ? "Pro" : "Basic"} unlocked`,
          "Your gang just got an upgrade. Enjoy!",
        );
      }
      return true;
    } catch (error) {
      console.warn("[billing] processing purchase failed:", error);
      Alert.alert(
        "Couldn't finish verification",
        "Your purchase is safe. Use Restore purchases after checking your connection.",
      );
      return false;
    } finally {
      processingTokens.current.delete(token);
      setBusy(false);
    }
  }, [applyProfilePatch, finishTransaction, refreshProfile]);

  useEffect(() => {
    processPurchaseRef.current = processPurchase;
  }, [processPurchase]);

  const purchase = useCallback(
    async (tier: PurchasableTier) => {
      if (busy) return;
      setBusy(true);
      try {
        let ready = connected;
        if (!ready) ready = await reconnect();
        if (!ready) throw new Error("Google Play is not available on this device.");

        if (!productsByTier[tier]) {
          await fetchProducts({ skus: SKUS, type: "subs" });
        }
        const product = productsByTier[tier];
        if (!product || product.platform !== "android") {
          throw new Error(
            "This plan is not available in Google Play for this installation.",
          );
        }

        const offer =
          product.subscriptionOffers?.find(
            (candidate) => candidate.offerTokenAndroid,
          ) ?? null;
        const legacyOffer = product.subscriptionOfferDetailsAndroid?.[0];
        const offerToken =
          offer?.offerTokenAndroid ?? legacyOffer?.offerToken ?? null;
        if (!offerToken) {
          throw new Error("Google Play did not return a subscription offer.");
        }

        const activePurchases = await getAvailablePurchases({
          includeSuspendedAndroid: false,
        });
        const existingSubscription = activePurchases.find(
          (purchase) =>
            purchase.productId !== product.id &&
            Boolean(SKU_TO_TIER[purchase.productId as AndroidSku]) &&
            purchase.purchaseToken,
        );

        const result = await requestPurchase({
          request: {
            google: {
              skus: [product.id],
              subscriptionOffers: [{ sku: product.id, offerToken }],
              obfuscatedAccountId: user?.id,
              ...(existingSubscription?.purchaseToken
                ? {
                    purchaseToken: existingSubscription.purchaseToken,
                    subscriptionProductReplacementParams: {
                      oldProductId: existingSubscription.productId,
                      replacementMode: "charge-prorated-price" as const,
                    },
                  }
                : {}),
            },
          },
          type: "subs",
        });
        if (!result || (Array.isArray(result) && result.length === 0)) {
          setBusy(false);
        }
      } catch (error) {
        setBusy(false);
        Alert.alert(
          "Google Play unavailable",
          error instanceof Error
            ? error.message
            : "Google Play could not start this purchase.",
        );
      }
    },
    [
      busy,
      connected,
      fetchProducts,
      productsByTier,
      reconnect,
      requestPurchase,
      user?.id,
    ],
  );

  const restore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      let ready = connected;
      if (!ready) ready = await reconnect();
      if (!ready) throw new Error("Google Play is not available on this device.");
      const purchases = await getAvailablePurchases({
        includeSuspendedAndroid: false,
      });
      const eligible = purchases.filter((purchase) =>
        Boolean(SKU_TO_TIER[purchase.productId as AndroidSku]),
      );
      if (eligible.length === 0) {
        Alert.alert(
          "Nothing to restore",
          "No active MyGang subscription was found for this Google Play account.",
        );
        return;
      }
      const results = await Promise.all(
        eligible.map((purchase) => processPurchase(purchase, true)),
      );
      if (results.some(Boolean)) {
        Alert.alert("Purchase restored", "Your MyGang plan is active again.");
      }
    } catch (error) {
      console.warn("[billing] restore failed:", error);
      Alert.alert(
        "Restore failed",
        "Google Play couldn't restore purchases. Check the Play account and connection, then try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, connected, processPurchase, reconnect]);

  const controller = useMemo<NativeBillingController>(
    () => ({ purchase, restore }),
    [purchase, restore],
  );

  useEffect(() => {
    onControllerChange(controller);
    return () => onControllerChange(null);
  }, [controller, onControllerChange]);

  useEffect(() => {
    onStatusChange({ busy, connected, loaded, prices });
  }, [busy, connected, loaded, onStatusChange, prices]);

  return null;
}
