import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
  const router = useRouter();
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

  const directionRef = useRef<"forward" | "backward">("forward");

  function goForward(next: Step) {
    directionRef.current = "forward";
    setStep(next);
  }

  function goBack() {
    const back = BACK_MAP[step];
    if (back) {
      directionRef.current = "backward";
      setStep(back);
    }
  }

  async function finalize() {
    if (!user) return;
    if (selectedIds.length < 2) return;

    try {
      console.log("[onboarding] finalize: persistGangMembership");
      await persistGangMembership(supabase, user.id, selectedIds);

      const trimmedCustomNames: Record<string, string> = {};
      for (const [k, v] of Object.entries(customNames)) {
        if (v && v.trim().length > 0) {
          trimmedCustomNames[k] = v.trim();
        }
      }

      console.log("[onboarding] finalize: profile update");
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: name.trim(),
          preferred_squad: selectedIds,
          onboarding_completed: true,
          // Free tier cannot use ecosystem mode; force gang_focus on the
          // freshly-created profile so the chat call doesn't 403 later.
          chat_mode: "gang_focus",
          custom_character_names:
            Object.keys(trimmedCustomNames).length > 0
              ? trimmedCustomNames
              : null,
          avatar_style_preference: avatarStyle,
          ...(vibeProfile ? { vibe_profile: vibeProfile } : {}),
        })
        .eq("id", user.id);

      if (profileError) {
        console.warn("[onboarding] profile update error:", profileError);
        Alert.alert(
          "Could not finish onboarding",
          profileError.message
        );
        setStep("INTRO");
        return;
      }

      console.log("[onboarding] finalize: refreshProfile");
      await refreshProfile();
      console.log("[onboarding] finalize: done");
    } catch (err) {
      console.warn("[onboarding] finalize threw:", err);
      Alert.alert(
        "Could not finish onboarding",
        err instanceof Error ? err.message : "Unknown error"
      );
      setStep("INTRO");
    }
  }

  const showBack = Boolean(BACK_MAP[step]) && step !== "LOADING";

  return (
    <SafeAreaView className="flex-1 bg-background">
      {showBack ? (
        <View className="absolute left-4 top-12 z-50">
          <Pressable
            onPress={goBack}
            className="rounded-full border border-border bg-card px-3 py-1.5"
          >
            <Text className="text-xs font-semibold text-muted-foreground">← Back</Text>
          </Pressable>
        </View>
      ) : null}

      {step !== "WELCOME" && step !== "LOADING" ? (
        <View className="absolute left-0 right-0 top-12 z-40 items-center">
          <StepIndicator
            total={STEP_ORDER.length - 1}
            current={STEP_ORDER.indexOf(step)}
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
              goForward("AVATAR_GIFT");
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
            onComplete={async () => {
              // Defensive: re-fetch profile RIGHT before navigating so the
              // route gate sees onboarding_completed=true and doesn't bounce
              // us back to /(app)/onboarding (which remounts at WELCOME).
              // The race we're guarding against: finalize() does the DB
              // update + refreshProfile, but if React state hasn't propagated
              // by the time the loading animation finishes, the gate fires
              // with stale `profile.onboarding_completed=false` and ping-pongs
              // us into a fresh onboarding session.
              console.log("[onboarding] LoadingStep onComplete → refreshing profile then routing");
              try {
                await refreshProfile();
              } catch (err) {
                console.warn("[onboarding] final refreshProfile threw:", err);
              }
              router.replace("/(app)/chat");
            }}
          />
        ) : null}
      </StepTransition>
    </SafeAreaView>
  );
}
