import { Pressable, Text, View } from "react-native";
import { PrimaryButton } from "../primary-button";

type WelcomeStepProps = {
  onNext: () => void;
  onLogin?: () => void;
};

export function WelcomeStep({ onNext, onLogin }: WelcomeStepProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="mb-4 text-center text-4xl font-bold leading-[1.1] tracking-tight text-primary">
        Your gang just arrived.
      </Text>
      <Text className="mb-8 max-w-md text-center text-base text-muted-foreground">
        Your friends are waiting. 24/7, no drama (mostly), just vibes.
      </Text>
      <View className="w-full max-w-xs">
        <PrimaryButton label="Assemble the Gang  →" onPress={onNext} size="xl" />
        {onLogin ? (
          <Pressable className="mt-5 self-center" onPress={onLogin}>
            <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Already have an account? Log in
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
