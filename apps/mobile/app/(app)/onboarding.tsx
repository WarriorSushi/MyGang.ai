import { useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CHARACTERS, usernameSchema } from "@mygang/shared";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import { FormField } from "../../components/form-field";
import { PrimaryButton } from "../../components/primary-button";
import { CharacterCard } from "../../components/character-card";

const SITE_URL = "https://mygang.ai";
const GANG_SIZE = 4;

const onboardingStepOneSchema = z.object({ username: usernameSchema });
type OnboardingStepOneInput = z.infer<typeof onboardingStepOneSchema>;

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<"username" | "gang">("username");
  const [username, setUsername] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingStepOneInput>({
    resolver: zodResolver(onboardingStepOneSchema),
    defaultValues: { username: "" },
  });

  function onUsernameSubmit(values: OnboardingStepOneInput) {
    setUsername(values.username);
    setStep("gang");
  }

  function toggleCharacter(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= GANG_SIZE) return prev;
      return [...prev, id];
    });
  }

  async function finalize() {
    if (!user) return;
    if (selected.length !== GANG_SIZE) {
      Alert.alert("Pick your gang", `Choose exactly ${GANG_SIZE} friends.`);
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        preferred_squad: selected,
        onboarding_completed: true,
      })
      .eq("id", user.id);
    setIsSubmitting(false);

    if (error) {
      Alert.alert("Could not save your gang", error.message);
      return;
    }
    await refreshProfile();
    // Route gate will redirect to (app)/index next render.
  }

  if (step === "username") {
    return (
      <View className="flex-1 justify-center bg-zinc-950 px-6">
        <Text className="mb-2 text-3xl font-bold text-white">Pick a username</Text>
        <Text className="mb-6 text-zinc-400">Your gang will know you by this.</Text>

        <FormField
          control={control}
          name="username"
          label="Username"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.username?.message}
        />

        <PrimaryButton label="Next" onPress={handleSubmit(onUsernameSubmit)} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-950 px-6 pt-12">
      <Text className="mb-2 text-3xl font-bold text-white">Pick your gang</Text>
      <Text className="mb-4 text-zinc-400">
        Choose {GANG_SIZE}. Selected: {selected.length}/{GANG_SIZE}.
      </Text>

      <FlatList
        data={CHARACTERS}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <CharacterCard
            character={item}
            selected={selected.includes(item.id)}
            onPress={() => toggleCharacter(item.id)}
            siteUrl={SITE_URL}
          />
        )}
        contentContainerClassName="pb-32"
      />

      <View className="absolute bottom-6 left-6 right-6">
        <PrimaryButton
          label={`Finish (${selected.length}/${GANG_SIZE})`}
          onPress={finalize}
          isLoading={isSubmitting}
          disabled={selected.length !== GANG_SIZE}
        />
      </View>
    </View>
  );
}
