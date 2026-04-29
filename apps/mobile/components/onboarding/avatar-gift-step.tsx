import { Text, View } from "react-native";
import { PrimaryButton } from "../primary-button";

type AvatarGiftStepProps = {
  onNext: () => void;
};

export function AvatarGiftStep({ onNext }: AvatarGiftStepProps) {
  return (
    <View className="flex-1 justify-center px-6">
      <View className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
        <View className="mx-auto h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15">
          <Text className="text-xl">🎁</Text>
        </View>
        <Text className="mt-3 text-center text-3xl font-black text-white">
          Free for Life
        </Text>
        <Text className="mt-1 text-center text-base font-semibold text-white/90">
          Gift from us to you.
        </Text>
        <Text className="mx-auto mt-2 max-w-sm text-center text-xs leading-relaxed text-zinc-400">
          As an early user,{" "}
          <Text className="font-semibold text-white">
            Human and Retro avatar packs are unlocked forever.
          </Text>
        </Text>

        <View className="mt-6">
          <PrimaryButton label="Continue" onPress={onNext} />
        </View>
      </View>
    </View>
  );
}
