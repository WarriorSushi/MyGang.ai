import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  CHARACTERS,
  applyAvatarStyleToGang,
  DEFAULT_AVATAR_STYLE,
  getSquadLimit,
  persistGangMembership,
  type AvatarStyle,
  type CharacterCatalogEntry,
  type SubscriptionTier,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { SelectionStep } from "../../components/onboarding/selection-step";

export default function EditGangScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const tier: SubscriptionTier =
    (profile?.subscription_tier as SubscriptionTier) ?? "free";
  const maxMembers = getSquadLimit(tier);
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

  const initialIds = useMemo<string[]>(() => {
    const raw = profile?.preferred_squad;
    if (Array.isArray(raw)) {
      return raw.filter((id): id is string => typeof id === "string");
    }
    return [];
  }, [profile?.preferred_squad]);

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [isSaving, setIsSaving] = useState(false);

  function toggleCharacter(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxMembers) return prev;
      return [...prev, id];
    });
  }

  async function save() {
    if (!user) return;
    if (selectedIds.length < 2) {
      Alert.alert("Not enough", "Pick at least 2 friends.");
      return;
    }

    setIsSaving(true);
    try {
      await persistGangMembership(supabase, user.id, selectedIds);
      const { error } = await supabase
        .from("profiles")
        .update({ preferred_squad: selectedIds })
        .eq("id", user.id);

      if (error) {
        Alert.alert("Could not save", error.message);
        setIsSaving(false);
        return;
      }
      await refreshProfile();
      router.back();
    } catch (err) {
      Alert.alert(
        "Could not save",
        err instanceof Error ? err.message : "Unknown error"
      );
      setIsSaving(false);
    }
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
        <Text className="text-base font-bold text-foreground">Edit gang</Text>
        <Pressable
          onPress={() => void save()}
          disabled={isSaving || selectedIds.length < 2}
          className={`rounded-full px-3 py-1.5 ${
            isSaving || selectedIds.length < 2
              ? "bg-muted"
              : "bg-primary"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              isSaving || selectedIds.length < 2
                ? "text-muted-foreground/70"
                : "text-primary-foreground"
            }`}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <SelectionStep
        characters={characters}
        selectedIds={selectedIds}
        toggleCharacter={toggleCharacter}
        maxMembers={maxMembers}
        avatarStyle={avatarStyle}
        onNext={() => void save()}
      />
    </SafeAreaView>
  );
}
