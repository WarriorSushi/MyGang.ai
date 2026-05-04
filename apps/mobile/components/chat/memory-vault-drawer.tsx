import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  type GestureResponderEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Brain, Sparkles, Trash2, X } from "lucide-react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import {
  FREE_MEMORY_VAULT_PREVIEW_LIMIT,
  getMemoryVaultPreviewLimit,
  getTierFromProfile,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { ConfirmDialog } from "../confirm-dialog";

type Memory = {
  id: string;
  content: string;
  created_at: string;
};

const PAGE_SIZE = 50;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 480);

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

type MemoryVaultDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

export function MemoryVaultDrawer({ visible, onClose }: MemoryVaultDrawerProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const tier = getTierFromProfile(profile?.subscription_tier ?? null);
  const previewLimit = getMemoryVaultPreviewLimit(tier);
  const isPreview = previewLimit !== null;

  const [memories, setMemories] = useState<Memory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !visible) return;
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
  }, [user, visible, previewLimit]);

  useEffect(() => {
    void load();
  }, [load]);

  const lockedCount = isPreview ? Math.max(0, totalCount - memories.length) : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1" onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(180)}
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        />

        <AnimatedPressable
          entering={SlideInRight.duration(220).springify().damping(22)}
          onPress={(e: GestureResponderEvent) => e.stopPropagation()}
          className="absolute bottom-0 right-0 top-0 overflow-hidden border-l border-border"
          style={{ width: DRAWER_WIDTH, backgroundColor: "#0c1220" }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border px-5 pb-3 pt-14">
            <View className="flex-1 flex-row items-center gap-3 pr-3">
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-primary/15">
                <Brain size={18} color="#5eead4" strokeWidth={2.4} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">
                  Memory Vault
                </Text>
                <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What the gang remembers
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full active:bg-card"
              accessibilityLabel="Close memory vault"
            >
              <X size={20} color="#a1a1aa" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Content */}
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#5eead4" />
            </View>
          ) : (
            <FlatList
              data={memories}
              keyExtractor={(m) => m.id}
              contentContainerClassName="px-4 py-3 pb-12"
              ListHeaderComponent={
                isPreview ? (
                  <View className="mb-3 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                      Starter Memory Preview
                    </Text>
                    <Text className="mt-2 text-sm font-semibold text-foreground">
                      Your first {FREE_MEMORY_VAULT_PREVIEW_LIMIT} memories stay
                      readable here, and the gang can lightly recall a couple
                      when it matters.
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      Keep talking and this starts to feel more like shared
                      history. After {FREE_MEMORY_VAULT_PREVIEW_LIMIT}, the
                      rest stays blurred until you unlock the full vault.
                    </Text>
                    <Text className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                      {memories.length} VISIBLE / {totalCount} ACTIVE MEMORIES
                    </Text>
                  </View>
                ) : (
                  <Text className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {totalCount} ACTIVE MEMORIES
                  </Text>
                )
              }
              ItemSeparatorComponent={() => <View className="h-2" />}
              renderItem={({ item }) => (
                <View className="overflow-hidden rounded-2xl border border-border/40 bg-card-translucent p-3">
                  <Text className="text-sm text-foreground">
                    {item.content}
                  </Text>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-[10px] text-muted-foreground/70">
                      {relativeTime(item.created_at)}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      {isPreview ? (
                        <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                          PREVIEW
                        </Text>
                      ) : null}
                      <Pressable
                        onPress={() => setPendingDeleteId(item.id)}
                        className="h-7 w-7 items-center justify-center rounded-full active:bg-destructive/20"
                        accessibilityLabel="Delete memory"
                      >
                        <Trash2 size={12} color="#fca5a5" strokeWidth={2.4} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
              ListFooterComponent={
                isPreview && lockedCount > 0 ? (
                  <View className="mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <View className="flex-row items-center gap-2">
                      <Sparkles size={14} color="#f0abfc" strokeWidth={2.4} />
                      <Text className="text-sm font-bold text-foreground">
                        {lockedCount} more{" "}
                        {lockedCount === 1 ? "memory" : "memories"} are waiting
                      </Text>
                    </View>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      Free plan shows up to {FREE_MEMORY_VAULT_PREVIEW_LIMIT}.
                      Upgrade to see all of them and let your gang recall the
                      full picture.
                    </Text>
                    <Pressable
                      onPress={() => {
                        onClose();
                        router.push("/(app)/pricing");
                      }}
                      className="mt-3 self-start overflow-hidden rounded-full"
                    >
                      <View className="flex-row items-center gap-1.5 bg-primary px-3 py-1.5">
                        <Sparkles
                          size={12}
                          color="#1a1d24"
                          strokeWidth={2.6}
                        />
                        <Text className="text-xs font-bold uppercase tracking-wider text-primary-foreground">
                          Unlock full memory
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View className="items-center px-6 py-12">
                  <Text className="text-center text-base text-muted-foreground">
                    No memories yet. Keep chatting and your gang will start
                    remembering.
                  </Text>
                </View>
              }
            />
          )}
        </AnimatedPressable>
      </Pressable>

      <ConfirmDialog
        visible={pendingDeleteId !== null}
        title="Delete this memory?"
        body="Your gang will forget it. This can't be undone."
        confirmLabel="Delete"
        variant="destructive"
        icon={Trash2}
        onConfirm={async () => {
          const id = pendingDeleteId;
          if (!id || !user) return;
          setPendingDeleteId(null);
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
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </Modal>
  );
}
