import { Text, View } from "react-native";
import type { TokenUsage } from "@mygang/shared";

const placeholderTokenUsage: TokenUsage = {
  promptChars: 0,
  responseChars: 0,
  historyCount: 0,
  provider: "none",
};

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
      <Text className="text-3xl font-bold text-white">MyGang</Text>
      <Text className="mt-2 text-base text-zinc-400">Hello from the gang.</Text>
      <Text className="mt-6 text-xs text-zinc-700">
        shared:{placeholderTokenUsage.provider}
      </Text>
    </View>
  );
}
