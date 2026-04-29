import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CHARACTERS,
  DEFAULT_AVATAR_STYLE,
  applyAvatarStyleToGang,
  getSquadLimit,
  persistGangMembership,
  recommendCharacters,
  type AvatarStyle,
  type CharacterCatalogEntry,
  type SubscriptionTier,
  type VibeProfile,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { WelcomeStep } from "../../components/onboarding/welcome-step";
import { IdentityStep } from "../../components/onboarding/identity-step";
import { VibeQuizStep } from "../../components/onboarding/vibe-quiz-step";
import { AvatarGiftStep } from "../../components/onboarding/avatar-gift-step";
import { AvatarStyleStep } from "../../components/onboarding/avatar-style-step";
import { SelectionStep } from "../../components/onboarding/selection-step";
import { FriendsIntroStep } from "../../components/onboarding/friends-intro-step";
import {
  LoadingStep,
  buildLoadingStates,
} from "../../components/onboarding/loading-step";

type Step =
  | "WELCOME"
  | "IDENTITY"
  | "VIBE_QUIZ"
  | "AVATAR_GIFT"
  | "AVATAR_STYLE"
  | "SELECTION"
  | "INTRO"
  | "LOADING";

const STEP_ORDER: Step[] = [
  "WELCOME",
  "IDENTITY",
  "VIBE_QUIZ",
  "AVATAR_GIFT",
  "AVATAR_STYLE",
  "SELECTION",
  "INTRO",
  "LOADING",
];

const BACK_MAP: Partial<Record<Step, Step>> = {
  IDENTITY: "WELCOME",
  VIBE_QUIZ: "IDENTITY",
  AVATAR_GIFT: "VIBE_QUIZ",
  AVATAR_STYLE: "AVATAR_GIFT",
  SELECTION: "AVATAR_STYLE",
  INTRO: "SELECTION",
};

export default function OnboardingScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>("WELCOME");
  const [name, setName] = useState("");
  const [vibeProfile, setVibeProfile] = useState<VibeProfile | null>(null);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(
    DEFAULT_AVATAR_STYLE
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});

  const tier: SubscriptionTier =
    (profile?.subscription_tier as SubscriptionTier) ?? "free";
  const maxMembers = getSquadLimit(tier);

  const characters: CharacterCatalogEntry[] = useMemo(() => {
    return applyAvatarStyleToGang(
      CHARACTERS as CharacterCatalogEntry[],
      avatarStyle
    ) as CharacterCatalogEntry[];
  }, [avatarStyle]);

  const recommendedIds = useMemo(() => {
    if (!vibeProfile) return [];
    return recommendCharacters(vibeProfile).slice(0, 4);
  }, [vibeProfile]);

  function toggleCharacter(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxMembers) return prev;
      return [...prev, id];
    });
  }

  function handleNameChange(characterId: string, nextName: string) {
    setCustomNames((prev) => ({ ...prev, [characterId]: nextName }));
  }

  function goBack() {
    const back = BACK_MAP[step];
    if (back) setStep(back);
  }

  async function finalize() {
    if (!user) return;
    if (selectedIds.length < 2) return;

    try {
      // Step 1: write to gangs + gang_members tables (same logic web uses)
      await persistGangMembership(supabase, user.id, selectedIds);

      // Step 2: trim custom names to non-empty entries
      const trimmedCustomNames: Record<string, string> = {};
      for (const [k, v] of Object.entries(customNames)) {
        if (v && v.trim().length > 0) {
          trimmedCustomNames[k] = v.trim();
        }
      }

      // Step 3: update profile with all the onboarding payload
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: name.trim(),
          preferred_squad: selectedIds,
          onboarding_completed: true,
          custom_character_names:
            Object.keys(trimmedCustomNames).length > 0
              ? trimmedCustomNames
              : null,
          avatar_style_preference: avatarStyle,
          ...(vibeProfile ? { vibe_profile: vibeProfile } : {}),
        })
        .eq("id", user.id);

      if (profileError) {
        Alert.alert(
          "Could not finish onboarding",
          profileError.message
        );
        setStep("INTRO");
        return;
      }

      await refreshProfile();
      // Route gate redirects to (app)/index on next render.
    } catch (err) {
      Alert.alert(
        "Could not finish onboarding",
        err instanceof Error ? err.message : "Unknown error"
      );
      setStep("INTRO");
    }
  }

  const showBack = Boolean(BACK_MAP[step]) && step !== "LOADING";

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top", "left", "right"]}>
      {showBack ? (
        <View className="absolute left-4 top-12 z-50">
          <Pressable
            onPress={goBack}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5"
          >
            <Text className="text-xs font-semibold text-zinc-400">← Back</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "WELCOME" ? (
        <WelcomeStep onNext={() => setStep("IDENTITY")} />
      ) : null}

      {step === "IDENTITY" ? (
        <IdentityStep
          name={name}
          setName={setName}
          onNext={() => setStep("VIBE_QUIZ")}
        />
      ) : null}

      {step === "VIBE_QUIZ" ? (
        <VibeQuizStep
          onNext={(vibe) => {
            setVibeProfile(vibe);
            setStep("AVATAR_GIFT");
          }}
        />
      ) : null}

      {step === "AVATAR_GIFT" ? (
        <AvatarGiftStep onNext={() => setStep("AVATAR_STYLE")} />
      ) : null}

      {step === "AVATAR_STYLE" ? (
        <AvatarStyleStep
          selectedStyle={avatarStyle}
          onSelectStyle={setAvatarStyle}
          onNext={() => setStep("SELECTION")}
        />
      ) : null}

      {step === "SELECTION" ? (
        <SelectionStep
          characters={characters}
          selectedIds={selectedIds}
          toggleCharacter={toggleCharacter}
          recommendedIds={recommendedIds}
          maxMembers={maxMembers}
          avatarStyle={avatarStyle}
          onNext={() => setStep("INTRO")}
        />
      ) : null}

      {step === "INTRO" ? (
        <FriendsIntroStep
          characters={characters}
          selectedIds={selectedIds}
          customNames={customNames}
          onNameChange={handleNameChange}
          avatarStyle={avatarStyle}
          onNext={() => {
            setStep("LOADING");
            // kick off backend write while loading animation plays
            finalize();
          }}
        />
      ) : null}

      {step === "LOADING" ? (
        <LoadingStep
          states={buildLoadingStates(
            characters
              .filter((c) => selectedIds.includes(c.id))
              .map((c) => ({
                displayName: customNames[c.id]?.trim() || c.name,
              })),
            name.trim() || undefined
          )}
          onComplete={() => {
            // The route gate handles the actual redirect once profile.onboarding_completed flips.
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
