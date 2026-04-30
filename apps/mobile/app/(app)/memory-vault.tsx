import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  FREE_MEMORY_VAULT_PREVIEW_LIMIT,
  getMemoryVaultPreviewLimit,
  getTierFromProfile,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

type Memory = {
  id: string;
  content: string;
  created_at: string;
};

const PAGE_SIZE = 50;

function relativeTime(iso: string): string {
  const created = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, (now - created) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = diffSec / 60;
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
  const diffH = diffMin / 60;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  const diffD = diffH / 24;
  if (diffD < 7) return `${Math.floor(diffD)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function MemoryVaultScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const tier = getTierFromProfile(profile?.subscription_tier ?? null);
  const previewLimit = getMemoryVaultPreviewLimit(tier);
  const isPreview = previewLimit !== null;

  const [memories, setMemories] = useState<Memory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const nowIso = new Date().toISOString();

    const limit = previewLimit ?? PAGE_SIZE;

    const [countResult, pageResult] = await Promise.all([
      supabase
        .from("memories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("kind", ["episodic", "compacted"])
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
      supabase
        .from("memories")
        .select("id, content, created_at, expires_at")
        .eq("user_id", user.id)
        .in("kind", ["episodic", "compacted"])
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    if (pageResult.error) {
      Alert.alert("Could not load memories", pageResult.error.message);
      setLoading(false);
      return;
    }

    const items: Memory[] = ((pageResult.data ?? []) as Memory[]).map((m) => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
    }));

    setMemories(items);
    setTotalCount(countResult.count ?? items.length);
    setLoading(false);
  }, [user, previewLimit]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteMemory(id: string) {
    if (!user) return;
    Alert.alert("Delete this memory?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("memories")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);
          if (error) {
            Alert.alert("Could not delete", error.message);
            return;
          }
          setMemories((prev) => prev.filter((m) => m.id !== id));
          setTotalCount((c) => Math.max(0, c - 1));
        },
      },
    ]);
  }

  const lockedCount = isPreview ? Math.max(0, totalCount - memories.length) : 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full border border-border bg-card px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-muted-foreground">← Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-foreground">Memory vault</Text>
        <View className="w-16" />
      </View>

      <View className="border-b border-border px-4 py-3">
        <Text className="text-xs text-muted-foreground">
          What your gang remembers about you.
        </Text>
        <Text className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/50">
          {totalCount} {totalCount === 1 ? "memory" : "memories"}
          {isPreview ? ` · showing ${memories.length}` : ""}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : memories.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-muted-foreground">
            No memories yet. Keep chatting and your gang will start remembering.
          </Text>
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(m) => m.id}
          contentContainerClassName="px-4 py-3 pb-12"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <View className="rounded-xl border border-border bg-card-translucent p-3">
              <Text className="text-sm text-foreground">{item.content}</Text>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-[10px] text-muted-foreground/70">
                  {relativeTime(item.created_at)}
                </Text>
                <Pressable
                  onPress={() => void deleteMemory(item.id)}
                  className="rounded-full px-2 py-1 active:bg-destructive/20"
                >
                  <Text className="text-[10px] font-semibold text-destructive">
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListFooterComponent={
            isPreview && lockedCount > 0 ? (
              <View className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
                <Text className="text-center text-sm font-semibold text-amber-300">
                  {lockedCount} more memor{lockedCount === 1 ? "y" : "ies"} locked
                </Text>
                <Text className="mt-1 text-center text-xs text-muted-foreground">
                  Free plan shows up to {FREE_MEMORY_VAULT_PREVIEW_LIMIT}.
                  Upgrade to see all of them.
                </Text>
                <Pressable
                  onPress={() => router.push("/(app)/pricing")}
                  className="mt-3 rounded-xl bg-primary px-4 py-2"
                >
                  <Text className="text-center text-sm font-semibold text-primary-foreground">
                    See plans
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
