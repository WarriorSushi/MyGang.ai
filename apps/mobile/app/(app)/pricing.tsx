import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  Heart,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import {
  TIER_COPY,
  getTierFromProfile,
  type SubscriptionTier,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { GradientText } from "../../components/gradient-text";
import { SITE_URL, apiUrl } from "../../lib/config";
import { openBillingPortal } from "../../lib/billing-portal";
import { supabase } from "../../lib/supabase";

const CHECKOUT_URL = apiUrl("checkout");

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
const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
};

const PLAN_HERO: Record<SubscriptionTier, { image: string | null }> = {
  free: { image: null },
  basic: { image: `${SITE_URL}/plan-basic.jpg` },
  pro: { image: `${SITE_URL}/plan-pro.jpg` },
};

const PLAN_PRICE: Record<
  SubscriptionTier,
  { amount: string; period: string; strike?: string; saveLabel?: string }
> = {
  free: { amount: "$0", period: "Free forever, no card needed" },
  basic: { amount: "$14.99", period: "/mo" },
  pro: { amount: "$19.99", period: "/mo", strike: "$99/mo", saveLabel: "SAVE 80%" },
};

const PLAN_TAGLINE: Record<SubscriptionTier, string> = {
  free: "Free forever, no card needed",
  basic: "Billed monthly. Cancel anytime.",
  pro: "Early adopter launch price.",
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account dashboard. You keep access until the end of your billing period.",
  },
  {
    q: "What happens to my gang if I downgrade?",
    a: "Your characters and chat history stay intact. You'll be limited to the new tier's squad size — choose which characters to keep.",
  },
  {
    q: "What does \"memory\" actually mean?",
    a: "Your gang remembers details from past conversations — names, preferences, inside jokes — and brings them back naturally. Higher tiers retain more.",
  },
  {
    q: "Is my data safe?",
    a: "All data is encrypted and never sold. You can delete your account and all associated data at any time from settings.",
  },
  {
    q: "Why is Pro so cheap right now?",
    a: "Early adopter launch pricing. Locks in for the lifetime of your subscription. Price will increase for new sign-ups after launch week.",
  },
];

export default function PricingScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const currentTier = getTierFromProfile(profile?.subscription_tier ?? null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  async function startSubscriptionPurchase(tier: "basic" | "pro") {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        Alert.alert("Not signed in", "Please sign in again before upgrading.");
        return;
      }

      const res = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: tier }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        checkout_url?: string;
        error?: string;
      };

      if (res.ok && body.checkout_url) {
        await Linking.openURL(body.checkout_url);
        return;
      }

      Alert.alert(
        "Couldn't open checkout",
        body.error ?? "Open mygang.ai/pricing in your browser.",
      );
    } catch (err) {
      console.warn("[billing] checkout link failed:", err);
      Alert.alert("Couldn't open checkout", "Open mygang.ai/pricing in your browser.");
    } finally {
      setPurchasing(false);
    }
  }

  async function managePlan() {
    await openBillingPortal();
  }


  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-5 pb-3 pt-12">
        <Pressable
          onPress={() => router.back()}
          className="min-h-11 flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={12} color="#a1a1aa" strokeWidth={2.5} />
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Back
          </Text>
        </Pressable>
        <Text className="text-base font-bold text-foreground">Plans</Text>
        <View className="w-16" />
      </View>

      <ScrollView contentContainerClassName="pb-12">
        <View className="px-5 pt-8">
          <View className="flex-row items-center gap-1.5 self-center rounded-full bg-primary/15 px-3 py-1.5">
            <Sparkles size={12} color="#5eead4" strokeWidth={2.5} />
            <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              LAUNCH PRICING - SAVE 80%
            </Text>
          </View>
          <Text className="mt-4 text-center text-4xl font-black text-foreground">
            Choose your
          </Text>
          <GradientText
            textClassName="text-center text-4xl font-black"
            colors={["#3eddc0", "#cbd5e1", "#d56db5"]}
          >
            vibe
          </GradientText>
          <Text className="mt-3 text-center text-sm text-muted-foreground">
            From casual hangs to unlimited chaos. Pick the plan that matches how
            hard you go.
          </Text>
        </View>

        <View className="mt-8 gap-4 px-5 pb-2">
          {ORDER.map((tierId, i) => {
            const copy = TIER_COPY[tierId];
            const isCurrent = currentTier === tierId;
            const features = FEATURES_BY_TIER[tierId];
            const hero = PLAN_HERO[tierId];
            const price = PLAN_PRICE[tierId];
            const isPro = tierId === "pro";
            const isLowerThanCurrent = TIER_RANK[tierId] < TIER_RANK[currentTier];
            const isUpgrade = TIER_RANK[tierId] > TIER_RANK[currentTier];

            const inner = (
              <View className="overflow-hidden rounded-3xl bg-background">
                {hero.image ? (
                  <View className="aspect-[2/1] w-full bg-muted">
                    <Image
                      source={{ uri: hero.image }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                ) : null}

                <View className="p-5">
                  {isPro ? (
                    <View className="self-start rounded-full bg-foreground px-3 py-1">
                      <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-background">
                        Most Popular
                      </Text>
                    </View>
                  ) : null}

                  <Text className="mt-2 text-2xl font-black text-foreground">
                    {copy.label}
                  </Text>

                  <View className="mt-1 flex-row items-baseline gap-2">
                    <Text className="text-3xl font-black text-foreground">
                      {price.amount}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {price.period}
                    </Text>
                  </View>
                  {price.strike ? (
                    <View className="mt-1 flex-row items-center gap-2">
                      <Text className="text-xs text-muted-foreground line-through">
                        {price.strike}
                      </Text>
                      {price.saveLabel ? (
                        <View className="rounded-full bg-red-500/15 px-2 py-0.5">
                          <Text className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                            {price.saveLabel}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <Text className="mt-3 text-xs text-muted-foreground">
                    {PLAN_TAGLINE[tierId]}
                  </Text>

                  <View className="mt-3 gap-1.5">
                    {features.map((feature) => (
                      <View
                        key={feature}
                        className="flex-row items-center gap-2"
                      >
                        <Text className="text-xs text-primary">✓</Text>
                        <Text className="flex-1 text-sm text-foreground/90">
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View className="mt-4">
                    {isCurrent ? (
                      <View className="h-11 items-center justify-center rounded-full border border-primary bg-primary/10">
                        <Text className="text-xs font-bold uppercase tracking-wider text-primary">
                          Current Plan
                        </Text>
                      </View>
                    ) : tierId === "free" ? (
                      isLowerThanCurrent ? (
                        <Pressable
                          onPress={() => void managePlan()}
                          className="min-h-11 items-center justify-center rounded-full border border-border bg-card px-4"
                          accessibilityRole="button"
                          accessibilityLabel="Manage plan"
                        >
                          <Text className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Manage plan
                          </Text>
                        </Pressable>
                      ) : null
                    ) : isLowerThanCurrent ? (
                      <Pressable
                        onPress={() => void managePlan()}
                        className="min-h-11 items-center justify-center rounded-full border border-border bg-card px-4"
                        accessibilityRole="button"
                        accessibilityLabel="Manage plan"
                      >
                        <Text className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Included in your plan
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() =>
                          isUpgrade
                            ? void startSubscriptionPurchase(
                                tierId as "basic" | "pro",
                              )
                            : void managePlan()
                        }
                        disabled={purchasing}
                        className={`h-11 flex-row items-center justify-center gap-1.5 rounded-full ${
                          isPro ? "bg-primary" : "border border-border bg-card"
                        } ${purchasing ? "opacity-60" : ""}`}
                      >
                        <Text
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isPro ? "text-primary-foreground" : "text-foreground"
                          }`}
                        >
                          {purchasing ? "Opening…" : `Get ${copy.label}`}
                        </Text>
                        <ArrowRight
                          size={12}
                          color={isPro ? "#1a1d24" : "#fff"}
                          strokeWidth={2.6}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );

            return (
              <Animated.View
                key={tierId}
                entering={FadeInDown.delay(i * 100).duration(280)}
              >
                {isPro ? (
                  <LinearGradient
                    colors={["#3eddc0", "#d56db5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 2, borderRadius: 26 }}
                  >
                    {inner}
                  </LinearGradient>
                ) : (
                  <View className="overflow-hidden rounded-3xl border border-border/50 bg-background">
                    {inner}
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>

        <View className="mt-12 px-5">
          <Text className="text-center text-3xl font-black text-foreground">
            Your personal group of friends,
          </Text>
          <GradientText
            textClassName="text-center text-3xl font-black"
            colors={["#3eddc0", "#cbd5e1", "#d56db5"]}
          >
            always with you
          </GradientText>

          <View className="mt-8 flex-row items-center justify-around">
            <View className="items-center">
              <Text className="text-3xl font-black text-foreground">24/7</Text>
              <Text className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Always Online
              </Text>
            </View>
            <View className="h-12 w-px bg-border" />
            <View className="items-center">
              <View className="flex-row items-center gap-1">
                <Heart size={18} color="#f0abfc" strokeWidth={2.4} />
                <Text className="text-3xl font-black text-foreground">100%</Text>
              </View>
              <Text className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Personality
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-12 px-5">
          <Text className="text-center text-2xl font-black text-foreground">
            Frequently asked questions
          </Text>
          <View className="mt-4 overflow-hidden rounded-3xl border border-border/50 bg-muted/40">
            {FAQS.map((faq, i) => {
              const isOpen = openFaqIndex === i;
              return (
                <View
                  key={faq.q}
                  className={
                    i < FAQS.length - 1 ? "border-b border-border/40" : ""
                  }
                >
                  <Pressable
                    onPress={() => setOpenFaqIndex(isOpen ? null : i)}
                    className="flex-row items-center gap-3 px-5 py-4 active:bg-muted/30"
                  >
                    <Text className="flex-1 text-sm font-semibold text-foreground">
                      {faq.q}
                    </Text>
                    <FaqChevron isOpen={isOpen} />
                  </Pressable>
                  {isOpen ? (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      className="px-5 pb-4"
                    >
                      <Text className="text-sm text-muted-foreground">
                        {faq.a}
                      </Text>
                    </Animated.View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <View className="mt-12 px-5">
          <Text className="text-center text-2xl font-black text-foreground">
            Ready to unlock the full experience?
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            Get unlimited messages, full memory, and extended responses. Your
            gang is waiting.
          </Text>
          <View className="mt-5 self-center">
            <Pressable
              onPress={() =>
                currentTier === "pro"
                  ? void managePlan()
                  : void startSubscriptionPurchase("pro")
              }
              disabled={purchasing}
              className={`h-12 flex-row items-center justify-center gap-1.5 rounded-full bg-primary px-6 ${
                purchasing ? "opacity-60" : ""
              }`}
            >
              <Sparkles size={14} color="#1a1d24" strokeWidth={2.6} />
              <Text className="text-sm font-bold uppercase tracking-wider text-primary-foreground">
                {purchasing
                  ? "Opening…"
                  : currentTier === "pro"
                    ? "Manage Pro"
                    : "Get Pro $19.99/mo"}
              </Text>
              <ArrowRight size={14} color="#1a1d24" strokeWidth={2.6} />
            </Pressable>
          </View>
        </View>

        <View className="mt-6 px-5">
          <View className="flex-row items-center justify-center gap-4">
            <View className="flex-row items-center gap-1">
              <Lock size={11} color="#a1a1aa" strokeWidth={2.5} />
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Secure Checkout
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <RotateCcw size={11} color="#a1a1aa" strokeWidth={2.5} />
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cancel Anytime
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <ShieldCheck size={11} color="#a1a1aa" strokeWidth={2.5} />
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                No Hidden Fees
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6 px-5">
          <Text className="text-center text-xs text-muted-foreground/70">
            {Platform.OS === "android"
              ? "Checkout opens mygang.ai while Expo Go testing continues. Google Play Billing returns before release."
              : "Subscriptions are managed via mygang.ai. Open the link to upgrade."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FaqChevron({ isOpen }: { isOpen: boolean }) {
  const rotation = useSharedValue(isOpen ? 180 : 0);
  useEffect(() => {
    rotation.value = withTiming(isOpen ? 180 : 0, { duration: 220 });
  }, [isOpen, rotation]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return (
    <Animated.View style={animStyle}>
      <ChevronDown size={16} color="#a1a1aa" strokeWidth={2.4} />
    </Animated.View>
  );
}
