import { Pressable, Text, View } from "react-native";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
      <Text className="text-3xl font-bold text-white">MyGang</Text>
      <Text className="mt-2 text-zinc-400">Signed in as</Text>
      <Text className="text-base text-white">{user?.email ?? "(unknown)"}</Text>
      <Pressable
        className="mt-8 rounded-lg bg-red-600 px-4 py-2 active:bg-red-700"
        onPress={() => supabase.auth.signOut()}
      >
        <Text className="text-white">Sign out</Text>
      </Pressable>
    </View>
  );
}
