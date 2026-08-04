import { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  CHARACTERS,
  applyAvatarStyleToGang,
  DEFAULT_AVATAR_STYLE,
  getTierFromProfile,
  resolveAvatarUrl,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { SITE_URL } from "../../lib/config";

export default function CustomNamesScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile, applyProfilePatch } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const tier = getTierFromProfile(profile?.subscription_tier ?? null);

  const avatarStyle: AvatarStyle =
    (profile?.avatar_style_preference as AvatarStyle) ?? DEFAULT_AVATAR_STYLE;

  const characters: CharacterCatalogEntry[] = useMemo(
    () =>
      applyAvatarStyleToGang(
        CHARACTERS as CharacterCatalogEntry[],
        avatarStyle
      ) as CharacterCatalogEntry[],
    [avatarStyle]
  );

  const gangIds = useMemo<string[]>(() => {
    const raw = profile?.preferred_squad;
    if (Array.isArray(raw)) {
      return raw.filter((id): id is string => typeof id === "string");
    }
    return [];
  }, [profile?.preferred_squad]);

  const gang = characters.filter((c) => gangIds.includes(c.id));

  const initialNames = useMemo(() => {
    const stored =
      (profile?.custom_character_names as Record<string, string> | null) ?? {};
    const out: Record<string, string> = {};
    for (const c of gang) {
      out[c.id] = stored[c.id] ?? "";
    }
    return out;
  }, [profile?.custom_character_names, gang]);

  const [names, setNames] = useState<Record<string, string>>(initialNames);

  function setName(id: string, value: string) {
    setNames((prev) => ({ ...prev, [id]: value.slice(0, 30) }));
  }

  async function save() {
    if (!user) return;
    if (tier === "free") {
      Alert.alert(
        "Unlock custom names",
        "Custom character names unlock with Basic or Pro.",
        [
          { text: "Not now", style: "cancel" },
          { text: "See plans", onPress: () => router.push("/(app)/pricing") },
        ],
      );
      return;
    }
    setIsSaving(true);

    const trimmed: Record<string, string> = {};
    for (const [k, v] of Object.entries(names)) {
      const t = v.trim();
      if (t.length > 0) trimmed[k] = t;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        custom_character_names: Object.keys(trimmed).length > 0 ? trimmed : null,
      })
      .eq("id", user.id);

    setIsSaving(false);
    if (error) {
      Alert.alert("Could not save", error.message);
      return;
    }
    applyProfilePatch({
      custom_character_names: Object.keys(trimmed).length > 0 ? trimmed : null,
    } as never);
    void refreshProfile();
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="min-h-11 justify-center rounded-full border border-border bg-card px-3"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text className="text-xs font-semibold text-muted-foreground">← Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-foreground">Custom names</Text>
        <Pressable
          onPress={() => void save()}
          disabled={isSaving}
          className={`min-h-11 justify-center rounded-full px-3 ${
            isSaving ? "bg-muted" : "bg-primary"
          }`}
          accessibilityRole="button"
          accessibilityLabel="Save custom names"
        >
          <Text
            className={`text-xs font-semibold ${
              isSaving ? "text-muted-foreground/70" : "text-primary-foreground"
            }`}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-4 pb-12"
        contentContainerStyle={{
          width: "100%",
          maxWidth: 720,
          alignSelf: "center",
        }}
      >
        {tier === "free" ? (
          <Pressable
            onPress={() => router.push("/(app)/pricing")}
            className="mb-4 min-h-11 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3"
            accessibilityRole="button"
            accessibilityLabel="See plans for custom names"
          >
            <Text className="text-sm font-bold text-primary">
              Custom names unlock with Basic or Pro
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Your current names are safe. Upgrade when you want to rename the
              gang across chat.
            </Text>
          </Pressable>
        ) : null}
        <Text className="mb-3 text-xs text-muted-foreground/70">
          Leave blank to keep the default name. Custom names show in the chat
          and across devices.
        </Text>

        <View className="gap-3">
          {gang.map((c) => {
            const url = `${SITE_URL}${resolveAvatarUrl(c.id, avatarStyle)}`;
            return (
              <View
                key={c.id}
                className="rounded-xl border border-border bg-card-translucent p-3"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 overflow-hidden rounded-xl border border-border bg-muted">
                    <Image
                      source={{ uri: url }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">
                      {c.name}
                    </Text>
                    {c.archetype ? (
                      <Text className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {c.archetype}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <TextInput
                  value={names[c.id] ?? ""}
                  onChangeText={(text) => setName(c.id, text)}
                  placeholder={c.name}
                  placeholderTextColor="#71717a"
                  maxLength={30}
                  editable={tier !== "free"}
                  className="mt-2 min-h-11 rounded-lg border border-border bg-muted px-3 text-sm text-foreground"
                />
              </View>
            );
          })}
        </View>

        {gang.length === 0 ? (
          <View className="mt-6 rounded-xl border border-border bg-card-translucent p-4">
            <Text className="text-center text-sm text-muted-foreground">
              Pick a gang first to set custom names.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
