import { Text, View } from "react-native";
import { Link } from "expo-router";

export default function SignInScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
      <Text className="text-2xl font-bold text-white">Sign In (placeholder)</Text>
      <Text className="mt-2 text-zinc-400">Real screen comes in Task 1.4.</Text>
      <Link href="/(auth)/sign-up" className="mt-6 text-white underline">
        Go to Sign Up →
      </Link>
    </View>
  );
}
