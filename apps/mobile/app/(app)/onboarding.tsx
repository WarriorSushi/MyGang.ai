import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { StepIndicator } from "../../components/onboarding/step-indicator";
import { StepTransition } from "../../components/onboarding/step-transition";

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

const RETAKE_STEP_ORDER: Step[] = [
  "VIBE_QUIZ",
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

const RETAKE_BACK_MAP: Partial<Record<Step, Step>> = {
  AVATAR_STYLE: "VIBE_QUIZ",
  SELECTION: "AVATAR_STYLE",
  INTRO: "SELECTION",
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string")
    : [];
}

function customNameMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export default function OnboardingScreen() {
  const { user, profile, refreshProfile, applyProfilePatch } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ retake?: string }>();
  const isRetake = params.retake === "true";
  const stepOrder = isRetake ? RETAKE_STEP_ORDER : STEP_ORDER;
  const backMap = isRetake ? RETAKE_BACK_MAP : BACK_MAP;
  const indicatorSteps = stepOrder.filter(
    (item) => item !== "WELCOME" && item !== "LOADING",
  );
  const [step, setStep] = useState<Step>(() =>
    isRetake ? "VIBE_QUIZ" : "WELCOME",
  );
  const [name, setName] = useState(() => profile?.username ?? "");
  const [vibeProfile, setVibeProfile] = useState<VibeProfile | null>(null);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(
    ((profile?.avatar_style_preference as AvatarStyle | null) ??
      DEFAULT_AVATAR_STYLE)
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    isRetake ? stringArray(profile?.preferred_squad) : [],
  );
  const [customNames, setCustomNames] = useState<Record<string, string>>(() =>
    isRetake ? customNameMap(profile?.custom_character_names) : {},
  );

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

  const directionRef = useRef<"forward" | "backward">("forward");

  function goForward(next: Step) {
    directionRef.current = "forward";
    setStep(next);
  }

  function goBack() {
    const back = backMap[step];
    if (back) {
      directionRef.current = "backward";
      setStep(back);
    }
  }

  async function finalize() {
    if (!user) return;
    if (selectedIds.length < 2) return;

    try {
      await persistGangMembership(supabase, user.id, selectedIds);

      const trimmedCustomNames: Record<string, string> = {};
      if (tier !== "free") {
        for (const [k, v] of Object.entries(customNames)) {
          if (v && v.trim().length > 0) {
            trimmedCustomNames[k] = v.trim();
          }
        }
      }

      const profilePatch = {
        username: name.trim(),
        preferred_squad: selectedIds,
        onboarding_completed: true,
        // Free tier cannot use ecosystem mode; force gang_focus on the
        // freshly-created profile so the chat call doesn't 403 later.
        chat_mode: "gang_focus" as const,
        avatar_style_preference: avatarStyle,
        ...(tier !== "free"
          ? {
              custom_character_names:
                Object.keys(trimmedCustomNames).length > 0
                  ? trimmedCustomNames
                  : null,
            }
          : {}),
        ...(vibeProfile ? { vibe_profile: vibeProfile } : {}),
      };

      // .select() so we can verify the UPDATE actually changed a row.
      // Without it, an UPDATE that matches 0 rows (e.g. RLS quietly filtered,
      // or the profile row doesn't exist) returns no error but persists nothing.
      const { data: updatedRows, error: profileError } = await supabase
        .from("profiles")
        .update(profilePatch)
        .eq("id", user.id)
        .select();

      if (profileError) {
        console.warn("[onboarding] profile update error:", profileError);
        Alert.alert(
          "Could not finish onboarding",
          profileError.message
        );
        setStep("INTRO");
        return;
      }

      if (!updatedRows || updatedRows.length === 0) {
        // UPDATE returned no error but matched 0 rows. Profile row probably
        // doesn't exist for this user (Supabase auth created the auth.users
        // row but the trigger to create profiles didn't fire). Try insert.
        console.warn(
          "[onboarding] profile UPDATE matched 0 rows for user",
          user.id,
          "— attempting INSERT",
        );
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: user.id, ...profilePatch });
        if (insertError) {
          console.warn("[onboarding] profile insert error:", insertError);
          Alert.alert(
            "Could not finish onboarding",
            insertError.message,
          );
          setStep("INTRO");
          return;
        }
      }

      // OPTIMISTIC LOCAL STATE UPDATE.
      // Don't depend on refreshProfile() here — if the supabase select hangs
      // (flaky network, stale connection), the route gate keeps reading stale
      // profile.onboarding_completed=false and ping-pongs the user back to
      // /(app)/onboarding when LoadingStep navigates to /(app)/chat.
      // Applying the patch to local state synchronously guarantees the gate
      // sees the new state next render.
      applyProfilePatch(profilePatch);

      // Best-effort background refresh to reconcile with server. May hang;
      // that's OK — local state is already correct.
      void refreshProfile().catch((err) =>
        console.warn("[onboarding] background refreshProfile threw:", err),
      );

    } catch (err) {
      console.warn("[onboarding] finalize threw:", err);
      Alert.alert(
        "Could not finish onboarding",
        err instanceof Error ? err.message : "Unknown error"
      );
      setStep("INTRO");
    }
  }

  const showBack = Boolean(backMap[step]) && step !== "LOADING";

  return (
    <SafeAreaView className="flex-1 bg-background">
      {showBack ? (
        <View className="absolute left-4 top-12 z-50">
          <Pressable
            onPress={goBack}
            className="min-h-11 justify-center rounded-full border border-border bg-card px-3 py-1.5"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text className="text-xs font-semibold text-muted-foreground">← Back</Text>
          </Pressable>
        </View>
      ) : null}

      {step !== "WELCOME" && step !== "LOADING" ? (
        <View className="absolute left-0 right-0 top-12 z-40 items-center">
          <StepIndicator
            total={indicatorSteps.length}
            current={Math.max(0, indicatorSteps.indexOf(step))}
          />
        </View>
      ) : null}

      <StepTransition stepKey={step} direction={directionRef.current}>
        {step === "WELCOME" ? (
          <WelcomeStep onNext={() => goForward("IDENTITY")} />
        ) : null}

        {step === "IDENTITY" ? (
          <IdentityStep
            name={name}
            setName={setName}
            onNext={() => goForward("VIBE_QUIZ")}
          />
        ) : null}

        {step === "VIBE_QUIZ" ? (
          <VibeQuizStep
            onNext={(vibe) => {
              setVibeProfile(vibe);
              goForward(isRetake ? "AVATAR_STYLE" : "AVATAR_GIFT");
            }}
          />
        ) : null}

        {step === "AVATAR_GIFT" ? (
          <AvatarGiftStep onNext={() => goForward("AVATAR_STYLE")} />
        ) : null}

        {step === "AVATAR_STYLE" ? (
          <AvatarStyleStep
            selectedStyle={avatarStyle}
            onSelectStyle={setAvatarStyle}
            onNext={() => goForward("SELECTION")}
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
            onNext={() => goForward("INTRO")}
          />
        ) : null}

        {step === "INTRO" ? (
          <FriendsIntroStep
            characters={characters}
            selectedIds={selectedIds}
            customNames={customNames}
            onNameChange={handleNameChange}
            avatarStyle={avatarStyle}
            canCustomizeNames={tier !== "free"}
            onNext={() => {
              goForward("LOADING");
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
              // Navigate IMMEDIATELY — never block on refreshProfile here.
              // Previous version awaited refreshProfile() which could hang
              // indefinitely on a flaky network or stale supabase connection,
              // leaving the user staring at the "let's go 🎉" screen forever.
              // finalize() (which ran ~19s before this fires) already did its
              // own refreshProfile, so the local profile state should be up
              // to date. We also kick off a background refresh as belt-and-
              // suspenders, but don't await it.
              router.replace("/(app)/chat");
              // Best-effort background refresh in case finalize's refresh
              // raced with React state propagation. Failures are harmless —
              // the route gate will recover on the next profile change.
              void refreshProfile().catch((err) =>
                console.warn("[onboarding] background refreshProfile threw:", err),
              );
            }}
          />
        ) : null}
      </StepTransition>
    </SafeAreaView>
  );
}
