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
  const { user, profile, refreshProfile, applyProfilePatch } = useAuth();
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

  function showLimitReached() {
    Alert.alert(
      "Squad limit reached",
      `Your ${tier} plan supports up to ${maxMembers} friends.`,
      [
        { text: "OK", style: "cancel" },
        ...(tier !== "pro"
          ? [
              {
                text: "See plans",
                onPress: () => router.push("/(app)/pricing"),
              },
            ]
          : []),
      ],
    );
  }

  async function save() {
    if (!user) return;
    if (selectedIds.length < 2) {
      Alert.alert("Not enough", "Pick at least 2 friends.");
      return;
    }
    if (selectedIds.length > maxMembers) {
      Alert.alert(
        "Too many friends",
        `Your ${tier} plan supports up to ${maxMembers}. Remove ${selectedIds.length - maxMembers} before saving.`,
      );
      return;
    }

    setIsSaving(true);
    try {
      await persistGangMembership(supabase, user.id, selectedIds);
      const { error } = await supabase
        .from("profiles")
        .update({
          preferred_squad: selectedIds,
          pending_squad_downgrade: false,
        })
        .eq("id", user.id);

      if (error) {
        Alert.alert("Could not save", error.message);
        setIsSaving(false);
        return;
      }
      applyProfilePatch({
        preferred_squad: selectedIds,
        pending_squad_downgrade: false,
      } as never);
      void refreshProfile();
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
        <Text className="text-base font-bold text-foreground">Edit gang</Text>
        <Pressable
          onPress={() => void save()}
          disabled={isSaving || selectedIds.length < 2}
          className={`min-h-11 justify-center rounded-full px-3 ${
            isSaving || selectedIds.length < 2 || selectedIds.length > maxMembers
              ? "bg-muted"
              : "bg-primary"
          }`}
          accessibilityRole="button"
          accessibilityLabel="Save gang"
          accessibilityState={{
            disabled: isSaving || selectedIds.length < 2 || selectedIds.length > maxMembers,
            busy: isSaving,
          }}
        >
          <Text
            className={`text-xs font-semibold ${
              isSaving || selectedIds.length < 2 || selectedIds.length > maxMembers
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
        title="Edit your gang"
        subtitle={`Choose 2-${maxMembers} friends for this plan.`}
        ctaLabel="Save gang"
        onNext={() => void save()}
        onLimitReached={showLimitReached}
      />
    </SafeAreaView>
  );
}
