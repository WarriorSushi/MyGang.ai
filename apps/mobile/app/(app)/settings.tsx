import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  AVATAR_STYLES,
  DEFAULT_AVATAR_STYLE,
  getTierCopy,
  getTierFromProfile,
  type AvatarStyle,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { clearPersistedMessages } from "../../lib/chat-storage";

const STYLE_LABELS: Record<AvatarStyle, string> = {
  robots: "Robots",
  human: "Human",
  retro: "Retro",
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [savingStyle, setSavingStyle] = useState(false);

  const tier = getTierFromProfile(profile?.subscription_tier ?? null);
  const tierCopy = getTierCopy(tier);
  const currentStyle: AvatarStyle =
    (profile?.avatar_style_preference as AvatarStyle) ?? DEFAULT_AVATAR_STYLE;

  async function setAvatarStyle(style: AvatarStyle) {
    if (!user || style === currentStyle) return;
    setSavingStyle(true);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_style_preference: style })
      .eq("id", user.id);
    setSavingStyle(false);
    if (error) {
      Alert.alert("Could not save", error.message);
      return;
    }
    await refreshProfile();
  }

  async function signOut() {
    if (user?.id) {
      await clearPersistedMessages(user.id);
    }
    await supabase.auth.signOut();
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between border-b border-zinc-800 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-zinc-400">← Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-white">Settings</Text>
        <View className="w-16" />
      </View>

      <ScrollView contentContainerClassName="pb-12">
        {/* Account section */}
        <View className="mt-4 px-4">
          <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Account
          </Text>
          <View className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
            <View className="border-b border-zinc-800 px-4 py-3">
              <Text className="text-[11px] uppercase tracking-wider text-zinc-500">
                Username
              </Text>
              <Text className="mt-0.5 text-base text-white">
                {profile?.username ?? "(unset)"}
              </Text>
            </View>
            <View className="border-b border-zinc-800 px-4 py-3">
              <Text className="text-[11px] uppercase tracking-wider text-zinc-500">
                Email
              </Text>
              <Text className="mt-0.5 text-base text-white">
                {user?.email ?? "(unknown)"}
              </Text>
            </View>
            <View className="px-4 py-3">
              <Text className="text-[11px] uppercase tracking-wider text-zinc-500">
                Plan
              </Text>
              <Text className="mt-0.5 text-base text-white">
                {tierCopy.label}{" "}
                <Text className="text-sm text-zinc-400">
                  · {tierCopy.priceLabel}
                </Text>
              </Text>
              <Text className="mt-0.5 text-xs text-zinc-500">
                {tierCopy.usageHeading}
              </Text>
            </View>
          </View>
        </View>

        {/* Appearance section */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Avatar pack
          </Text>
          <View className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
            {AVATAR_STYLES.map((style, index) => {
              const isCurrent = currentStyle === style;
              return (
                <Pressable
                  key={style}
                  onPress={() => void setAvatarStyle(style)}
                  disabled={savingStyle}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    index < AVATAR_STYLES.length - 1
                      ? "border-b border-zinc-800"
                      : ""
                  }`}
                >
                  <Text className="text-base text-white">
                    {STYLE_LABELS[style]}
                  </Text>
                  {isCurrent ? (
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-white">
                      <Text className="text-xs font-bold text-zinc-950">✓</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-2 px-1 text-xs text-zinc-500">
            Changes the visual style of every character. Human and Retro packs
            are unlocked for early users.
          </Text>
        </View>

        {/* Danger section */}
        <View className="mt-8 px-4">
          <Pressable
            onPress={confirmSignOut}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
          >
            <Text className="text-center text-sm font-semibold text-red-400">
              Sign out
            </Text>
          </Pressable>
        </View>

        <View className="mt-6 px-4">
          <Text className="text-center text-[10px] text-zinc-600">
            MyGang.ai · v0.0.1
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
