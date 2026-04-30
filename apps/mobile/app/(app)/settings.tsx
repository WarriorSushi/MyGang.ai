import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import {
  AVATAR_STYLES,
  CHAT_WALLPAPERS,
  DEFAULT_AVATAR_STYLE,
  getTierCopy,
  getTierFromProfile,
  type AvatarStyle,
  type ChatWallpaper,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { clearPersistedMessages } from "../../lib/chat-storage";

const STYLE_LABELS: Record<AvatarStyle, string> = {
  robots: "Robots",
  human: "Human",
  retro: "Retro",
};

type ChatMode = "gang_focus" | "ecosystem";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [savingField, setSavingField] = useState<string | null>(null);

  const tier = getTierFromProfile(profile?.subscription_tier ?? null);
  const tierCopy = getTierCopy(tier);
  const currentStyle: AvatarStyle =
    (profile?.avatar_style_preference as AvatarStyle) ?? DEFAULT_AVATAR_STYLE;
  const currentWallpaper: ChatWallpaper =
    (profile?.chat_wallpaper as ChatWallpaper) ?? "default";
  const currentChatMode: ChatMode =
    (profile?.chat_mode as ChatMode) ?? "gang_focus";

  async function updateProfileField(
    field: string,
    value: string,
    label: string
  ) {
    if (!user) return;
    setSavingField(field);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", user.id);
    setSavingField(null);
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
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full border border-border bg-card px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-muted-foreground">← Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-foreground">Settings</Text>
        <View className="w-16" />
      </View>

      <ScrollView contentContainerClassName="pb-12">
        {/* Account section */}
        <View className="mt-4 px-4">
          <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Account
          </Text>
          <View className="overflow-hidden rounded-xl border border-border bg-card-translucent">
            <View className="border-b border-border px-4 py-3">
              <Text className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                Username
              </Text>
              <Text className="mt-0.5 text-base text-foreground">
                {profile?.username ?? "(unset)"}
              </Text>
            </View>
            <View className="border-b border-border px-4 py-3">
              <Text className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                Email
              </Text>
              <Text className="mt-0.5 text-base text-foreground">
                {user?.email ?? "(unknown)"}
              </Text>
            </View>
            <Link href="/(app)/pricing" asChild>
              <Pressable className="px-4 py-3 active:bg-muted/50">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                      Plan
                    </Text>
                    <Text className="mt-0.5 text-base text-foreground">
                      {tierCopy.label}{" "}
                      <Text className="text-sm text-muted-foreground">
                        · {tierCopy.priceLabel}
                      </Text>
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground/70">
                      {tierCopy.usageHeading}
                    </Text>
                  </View>
                  {tier === "free" ? (
                    <View className="rounded-full bg-amber-500/15 px-3 py-1">
                      <Text className="text-[10px] font-bold text-amber-400">
                        Upgrade
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Gang section */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Your gang
          </Text>
          <View className="overflow-hidden rounded-xl border border-border bg-card-translucent">
            <Link href="/(app)/edit-gang" asChild>
              <Pressable className="border-b border-border active:bg-muted/50">
                <View className="flex-row items-center justify-between px-4 py-3">
                  <View className="flex-1">
                    <Text className="text-base text-foreground">Manage gang</Text>
                    <Text className="text-xs text-muted-foreground/70">
                      Add or remove characters
                    </Text>
                  </View>
                  <Text className="text-muted-foreground/70">›</Text>
                </View>
              </Pressable>
            </Link>
            <Link href="/(app)/custom-names" asChild>
              <Pressable className="border-b border-border active:bg-muted/50">
                <View className="flex-row items-center justify-between px-4 py-3">
                  <View className="flex-1">
                    <Text className="text-base text-foreground">Custom names</Text>
                    <Text className="text-xs text-muted-foreground/70">
                      Rename characters in your chat
                    </Text>
                  </View>
                  <Text className="text-muted-foreground/70">›</Text>
                </View>
              </Pressable>
            </Link>
            <Link href="/(app)/memory-vault" asChild>
              <Pressable className="active:bg-muted/50">
                <View className="flex-row items-center justify-between px-4 py-3">
                  <View className="flex-1">
                    <Text className="text-base text-foreground">Memory vault</Text>
                    <Text className="text-xs text-muted-foreground/70">
                      What your gang remembers about you
                    </Text>
                  </View>
                  <Text className="text-muted-foreground/70">›</Text>
                </View>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Chat mode section */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Chat mode
          </Text>
          <View className="overflow-hidden rounded-xl border border-border bg-card-translucent">
            {(["gang_focus", "ecosystem"] as ChatMode[]).map((mode, idx) => {
              const isCurrent = currentChatMode === mode;
              const label = mode === "gang_focus" ? "Gang focus" : "Ecosystem";
              const desc =
                mode === "gang_focus"
                  ? "Just your selected gang chats with you."
                  : "All 14 characters can drop in occasionally.";
              return (
                <Pressable
                  key={mode}
                  onPress={() =>
                    void updateProfileField("chat_mode", mode, label)
                  }
                  disabled={savingField !== null}
                  className={`px-4 py-3 active:bg-muted/50 ${
                    idx === 0 ? "border-b border-border" : ""
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base text-foreground">{label}</Text>
                      <Text className="text-xs text-muted-foreground/70">{desc}</Text>
                    </View>
                    {isCurrent ? (
                      <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Text className="text-xs font-bold text-primary-foreground">✓</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Avatar pack section */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Avatar pack
          </Text>
          <View className="overflow-hidden rounded-xl border border-border bg-card-translucent">
            {AVATAR_STYLES.map((style, index) => {
              const isCurrent = currentStyle === style;
              return (
                <Pressable
                  key={style}
                  onPress={() =>
                    void updateProfileField(
                      "avatar_style_preference",
                      style,
                      STYLE_LABELS[style]
                    )
                  }
                  disabled={savingField !== null}
                  className={`flex-row items-center justify-between px-4 py-3 active:bg-muted/50 ${
                    index < AVATAR_STYLES.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <Text className="text-base text-foreground">
                    {STYLE_LABELS[style]}
                  </Text>
                  {isCurrent ? (
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <Text className="text-xs font-bold text-primary-foreground">✓</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Wallpaper section */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Chat wallpaper
          </Text>
          <View className="overflow-hidden rounded-xl border border-border bg-card-translucent">
            {CHAT_WALLPAPERS.map((w, idx) => {
              const isCurrent = currentWallpaper === w.id;
              return (
                <Pressable
                  key={w.id}
                  onPress={() =>
                    void updateProfileField("chat_wallpaper", w.id, w.label)
                  }
                  disabled={savingField !== null}
                  className={`px-4 py-3 active:bg-muted/50 ${
                    idx < CHAT_WALLPAPERS.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base text-foreground">{w.label}</Text>
                      <Text className="text-xs text-muted-foreground/70">
                        {w.description}
                      </Text>
                    </View>
                    {isCurrent ? (
                      <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Text className="text-xs font-bold text-primary-foreground">✓</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Danger section */}
        <View className="mt-8 px-4">
          <Pressable
            onPress={confirmSignOut}
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
          >
            <Text className="text-center text-sm font-semibold text-destructive">
              Sign out
            </Text>
          </Pressable>
        </View>

        <View className="mt-3 px-4">
          <Link href="/(app)/delete-account" asChild>
            <Pressable className="rounded-xl px-4 py-3 active:bg-muted/50">
              <Text className="text-center text-xs text-muted-foreground/70 underline">
                Delete account
              </Text>
            </Pressable>
          </Link>
        </View>

        <View className="mt-6 px-4">
          <Text className="text-center text-[10px] text-muted-foreground/50">
            MyGang.ai · v0.0.1
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
