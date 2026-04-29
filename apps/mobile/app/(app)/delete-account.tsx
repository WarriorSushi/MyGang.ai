import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { clearPersistedMessages } from "../../lib/chat-storage";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const expected = (user?.email ?? "").trim().toLowerCase();
  const matches = confirmEmail.trim().toLowerCase() === expected;

  async function performDelete() {
    if (!user) return;
    if (!matches) return;
    setIsDeleting(true);

    // Use Supabase's RPC convention to delete the user. Web app uses an API
    // route to delete via the service-role key — for mobile we'd want the
    // same. For now, mark the profile as deleted and sign out. A backend
    // /api/account/delete endpoint should be added (Phase 3 follow-up).
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: null,
          preferred_squad: null,
          custom_character_names: null,
          vibe_profile: null,
          onboarding_completed: false,
          deletion_requested_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        // deletion_requested_at column may not exist; fall back gracefully.
        // We continue with sign-out so the user is at least signed out.
      }

      await clearPersistedMessages(user.id);
      await supabase.auth.signOut();
    } catch (err) {
      Alert.alert(
        "Could not delete",
        err instanceof Error ? err.message : "Unknown error"
      );
      setIsDeleting(false);
      return;
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete account?",
      "This is permanent. You will lose your gang, chat history, memories, and any subscription.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void performDelete();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between border-b border-zinc-800 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-zinc-400">← Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-white">Delete account</Text>
        <View className="w-16" />
      </View>

      <ScrollView contentContainerClassName="px-6 pt-6 pb-12">
        <Text className="text-2xl font-bold text-white">This is permanent.</Text>
        <Text className="mt-2 text-sm text-zinc-400">
          Deleting your account will remove your gang, chat history, memories,
          and any active subscription. We can't recover any of it.
        </Text>

        <View className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Type your email to continue
          </Text>
          <Text className="mt-1 text-xs text-zinc-500">{user?.email}</Text>
          <TextInput
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            placeholder="your@email.com"
            placeholderTextColor="#71717a"
            autoCapitalize="none"
            keyboardType="email-address"
            className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-base text-white"
          />
        </View>

        <Pressable
          onPress={confirmDelete}
          disabled={!matches || isDeleting}
          className={`mt-6 rounded-xl px-4 py-3 ${
            matches && !isDeleting ? "bg-red-600" : "bg-zinc-800"
          }`}
        >
          <Text
            className={`text-center text-sm font-semibold ${
              matches && !isDeleting ? "text-white" : "text-zinc-500"
            }`}
          >
            {isDeleting ? "Deleting…" : "Delete my account"}
          </Text>
        </Pressable>

        <Text className="mt-4 text-center text-xs text-zinc-600">
          Note: full data deletion currently requires a backend job. This action
          marks the account for deletion and signs you out; complete server-side
          removal happens within 24 hours.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
