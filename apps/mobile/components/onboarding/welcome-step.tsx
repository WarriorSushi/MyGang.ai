import { Pressable, Text, View } from "react-native";
import { PrimaryButton } from "../primary-button";

type WelcomeStepProps = {
  onNext: () => void;
  onLogin?: () => void;
};

export function WelcomeStep({ onNext, onLogin }: WelcomeStepProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="mb-3 text-center text-3xl font-bold leading-tight text-white">
        Your gang just arrived.
      </Text>
      <Text className="mb-8 text-center text-base text-zinc-400">
        Your friends are waiting. 24/7, no drama (mostly), just vibes.
      </Text>
      <View className="w-full max-w-xs">
        <PrimaryButton label="Assemble the Gang" onPress={onNext} />
        {onLogin ? (
          <Pressable className="mt-4 self-center" onPress={onLogin}>
            <Text className="text-[10px] uppercase tracking-widest text-zinc-500">
              Already have an account? Log in
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
