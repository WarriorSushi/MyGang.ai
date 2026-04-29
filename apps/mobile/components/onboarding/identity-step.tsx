import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { PrimaryButton } from "../primary-button";

type IdentityStepProps = {
  name: string;
  setName: (name: string) => void;
  onNext: () => void;
};

export function IdentityStep({ name, setName, onNext }: IdentityStepProps) {
  const [touched, setTouched] = useState(false);
  const trimmedLength = name.trim().length;
  const canContinue = trimmedLength >= 2;
  const charsRemaining = trimmedLength < 2 ? 2 - trimmedLength : null;

  return (
    <View className="flex-1 justify-center px-6">
      <Text className="mb-6 text-center text-2xl font-bold text-white">
        What should they call you?
      </Text>
      <TextInput
        value={name}
        onChangeText={(text) => setName(text.slice(0, 30))}
        onBlur={() => setTouched(true)}
        placeholder="Your nickname..."
        placeholderTextColor="#52525b"
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={30}
        autoFocus
        onSubmitEditing={() => canContinue && onNext()}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 text-lg text-white"
      />
      <Text className="mt-2 px-1 text-[11px] text-zinc-500">
        {charsRemaining !== null
          ? `${charsRemaining} more character${charsRemaining === 1 ? "" : "s"} needed`
          : `${name.length}/30`}
      </Text>
      <View className="mt-6">
        <PrimaryButton
          label="Next"
          onPress={onNext}
          disabled={!canContinue}
        />
      </View>
    </View>
  );
}
