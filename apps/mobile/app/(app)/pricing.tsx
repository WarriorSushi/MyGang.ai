import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  TIER_COPY,
  TIER_LIMITS,
  getTierFromProfile,
  type SubscriptionTier,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";

const PRICING_URL = "https://mygang.ai/pricing";

const FEATURES_BY_TIER: Record<SubscriptionTier, string[]> = {
  free: [
    "25 messages per hour",
    "5-memory preview",
    "Squad up to 4 friends",
    "Robots avatar pack",
  ],
  basic: [
    "40 messages per hour",
    "Improved longer memory",
    "Squad up to 5 friends",
    "All avatar packs (Robots, Human, Retro)",
    "Custom character names",
    "Chat wallpapers",
  ],
  pro: [
    "Unlimited messages",
    "Solid large memory",
    "Squad up to 6 friends",
    "Highest priority response speed",
    "Everything in Basic",
  ],
};

const ORDER: SubscriptionTier[] = ["free", "basic", "pro"];

export default function PricingScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const currentTier = getTierFromProfile(profile?.subscription_tier ?? null);

  function openCheckout() {
    void Linking.openURL(PRICING_URL);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full border border-border bg-card px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-muted-foreground">← Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-foreground">Plans</Text>
        <View className="w-16" />
      </View>

      <ScrollView contentContainerClassName="px-4 pt-4 pb-12">
        <Text className="text-center text-3xl font-black text-foreground">
          Pick your plan
        </Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">
          Upgrade any time. Cancel any time.
        </Text>

        <View className="mt-6 gap-3">
          {ORDER.map((tier) => {
            const copy = TIER_COPY[tier];
            const isCurrent = currentTier === tier;
            const features = FEATURES_BY_TIER[tier];

            return (
              <View
                key={tier}
                className={`overflow-hidden rounded-2xl border p-4 ${
                  isCurrent
                    ? "border-primary bg-card"
                    : "border-border bg-card-translucent"
                }`}
              >
                <View className="flex-row items-start justify-between">
                  <View>
                    <Text className="text-2xl font-black text-foreground">
                      {copy.label}
                    </Text>
                    <Text className="mt-1 text-base text-muted-foreground">
                      {copy.priceLabel}
                    </Text>
                  </View>
                  {isCurrent ? (
                    <View className="rounded-full bg-primary px-3 py-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Current
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text className="mt-2 text-sm text-foreground/85">
                  {copy.usageDescription}
                </Text>

                <View className="mt-3 gap-1.5">
                  {features.map((feature) => (
                    <View key={feature} className="flex-row items-center gap-2">
                      <Text className="text-xs text-emerald-400">✓</Text>
                      <Text className="flex-1 text-sm text-foreground/85">
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {tier !== "free" && tier !== currentTier ? (
                  <Pressable
                    onPress={openCheckout}
                    className="mt-4 rounded-xl bg-primary px-4 py-3 active:opacity-90"
                  >
                    <Text className="text-center text-sm font-semibold text-primary-foreground">
                      Upgrade to {copy.label}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        <View className="mt-6 px-1">
          <Text className="text-center text-xs text-muted-foreground/70">
            Subscriptions are managed via mygang.ai for now. Native in-app
            billing is coming soon.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
