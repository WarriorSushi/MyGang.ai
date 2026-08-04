import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Brain, Check, Edit3, Search, Sparkles, Trash2, X } from "lucide-react-native";
import {
  FREE_MEMORY_VAULT_PREVIEW_LIMIT,
  getMemoryVaultPreviewLimit,
  getTierFromProfile,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { deleteMemoryApi, updateMemoryApi } from "../../lib/memories-api";
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async (reset = true, offsetOverride = 0) => {
    if (!user || !visible) return;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setLoadError(null);
    if (reset) setActionError(null);
    const nowIso = new Date().toISOString();
    const queryText = search.trim();
    const limit = previewLimit ?? PAGE_SIZE;
    const offset = reset ? 0 : offsetOverride;

    let countQuery = supabase
      .from("memories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("kind", ["episodic", "compacted"])
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

    let pageQuery = supabase
      .from("memories")
      .select("id, content, created_at, expires_at")
      .eq("user_id", user.id)
      .in("kind", ["episodic", "compacted"])
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false });

    if (queryText) {
      countQuery = countQuery.ilike("content", `%${queryText}%`);
      pageQuery = pageQuery.ilike("content", `%${queryText}%`);
    }

    const requested = isPreview ? limit : limit + 1;
    pageQuery = pageQuery.range(offset, offset + requested - 1);

    const [countResult, pageResult] = await Promise.all([
      countQuery,
      pageQuery,
    ]);

    if (pageResult.error) {
      setLoadError(pageResult.error.message);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const rawItems = ((pageResult.data ?? []) as Memory[]).slice(0, limit);
    const items: Memory[] = rawItems.map((m) => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
    }));

    setMemories((prev) => (reset ? items : [...prev, ...items]));
    setTotalCount(countResult.count ?? items.length);
    setHasMore(!isPreview && (pageResult.data?.length ?? 0) > limit);
    setLoading(false);
    setLoadingMore(false);
  }, [isPreview, previewLimit, search, user, visible]);

  useEffect(() => {
    void load(true);
  }, [load]);

  function beginEdit(memory: Memory) {
    setEditingId(memory.id);
    setEditContent(memory.content);
    setActionError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function saveEdit(id: string) {
    const next = editContent.trim();
    if (!next) {
      setActionError("Memory cannot be empty.");
      return;
    }
    const previous = memories.find((m) => m.id === id)?.content;
    setEditingId(null);
    setSavingId(id);
    setActionError(null);
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: next } : m)),
    );
    const result = await updateMemoryApi(id, next);
    setSavingId(null);
    if (!result.ok) {
      if (previous !== undefined) {
        setMemories((prev) =>
          prev.map((m) => (m.id === id ? { ...m, content: previous } : m)),
        );
      }
      setActionError(result.error);
    }
  }

  const lockedCount = isPreview ? Math.max(0, totalCount - memories.length) : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        <Pressable
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close memory vault"
        >
          <Animated.View
            entering={FadeIn.duration(180)}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.6)" },
            ]}
          />
        </Pressable>

        <Animated.View
          entering={SlideInRight.duration(220)}
          className="absolute bottom-0 right-0 top-0 overflow-hidden border-l border-border bg-background"
          style={{ width: DRAWER_WIDTH }}
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
              className="h-11 w-11 items-center justify-center rounded-full active:bg-card"
              accessibilityRole="button"
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
              className="flex-1"
              data={memories}
              keyExtractor={(m) => m.id}
              contentContainerClassName="px-4 py-3 pb-12"
              ListHeaderComponent={
                <>
                  <View className="mb-3 flex-row items-center gap-2 rounded-2xl border border-border bg-card-translucent px-3 py-2">
                    <Search size={16} color="#71717a" strokeWidth={2.4} />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search memories"
                      placeholderTextColor="#71717a"
                      accessibilityLabel="Search memories"
                      className="min-h-11 flex-1 text-sm text-foreground"
                    />
                  </View>
                  {loadError ? (
                    <View className="mb-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3">
                      <Text className="text-sm font-semibold text-destructive">
                        Could not load memories
                      </Text>
                      <Text className="mt-1 text-xs text-muted-foreground">
                        {loadError}
                      </Text>
                      <Pressable
                        onPress={() => void load(true)}
                        className="mt-3 min-h-11 self-start justify-center rounded-full border border-destructive/30 px-4"
                        accessibilityRole="button"
                        accessibilityLabel="Retry loading memories"
                      >
                        <Text className="text-xs font-bold uppercase tracking-wider text-destructive">
                          Retry
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {actionError ? (
                    <View className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                      <Text className="text-sm font-semibold text-amber-300">
                        Could not update memory
                      </Text>
                      <Text className="mt-1 text-xs text-muted-foreground">
                        {actionError}
                      </Text>
                    </View>
                  ) : null}
                  {isPreview ? (
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
                  )}
                </>
              }
              ItemSeparatorComponent={() => <View className="h-2" />}
              renderItem={({ item }) => (
                <View className="overflow-hidden rounded-2xl border border-border/40 bg-card-translucent p-3">
                  {editingId === item.id ? (
                    <TextInput
                      value={editContent}
                      onChangeText={setEditContent}
                      multiline
                      maxLength={2000}
                      className="min-h-[88px] rounded-2xl border border-border bg-card px-3 py-3 text-sm text-foreground"
                      placeholder="Update memory"
                      placeholderTextColor="#71717a"
                      style={{ textAlignVertical: "top" }}
                    />
                  ) : (
                    <Text className="text-sm text-foreground">
                      {item.content}
                    </Text>
                  )}
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
                      {!isPreview && editingId === item.id ? (
                        <>
                          <Pressable
                            onPress={cancelEdit}
                            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
                            accessibilityRole="button"
                            accessibilityLabel="Cancel editing memory"
                          >
                            <X size={14} color="#a1a1aa" strokeWidth={2.4} />
                          </Pressable>
                          <Pressable
                            onPress={() => void saveEdit(item.id)}
                            className="h-11 w-11 items-center justify-center rounded-full active:bg-primary/20"
                            accessibilityRole="button"
                            accessibilityLabel="Save memory"
                          >
                            <Check size={14} color="#5eead4" strokeWidth={2.6} />
                          </Pressable>
                        </>
                      ) : null}
                      {!isPreview && editingId !== item.id ? (
                        <>
                          <Pressable
                            onPress={() => beginEdit(item)}
                            disabled={savingId === item.id}
                            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
                            accessibilityRole="button"
                            accessibilityLabel="Edit memory"
                          >
                            {savingId === item.id ? (
                              <ActivityIndicator color="#5eead4" />
                            ) : (
                              <Edit3 size={13} color="#a1a1aa" strokeWidth={2.4} />
                            )}
                          </Pressable>
                          <Pressable
                            onPress={() => setPendingDeleteId(item.id)}
                            className="h-11 w-11 items-center justify-center rounded-full active:bg-destructive/20"
                            accessibilityRole="button"
                            accessibilityLabel="Delete memory"
                          >
                            <Trash2 size={12} color="#fca5a5" strokeWidth={2.4} />
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}
              ListFooterComponent={
                <>
                {!isPreview && hasMore ? (
                  <Pressable
                    onPress={() => void load(false, memories.length)}
                    disabled={loadingMore}
                    className="mt-4 min-h-11 items-center justify-center rounded-full border border-border bg-card-translucent active:bg-muted/40"
                    accessibilityRole="button"
                    accessibilityLabel="Load more memories"
                    accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
                  >
                    {loadingMore ? (
                      <ActivityIndicator color="#5eead4" />
                    ) : (
                      <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Load more memories
                      </Text>
                    )}
                  </Pressable>
                ) : null}
                {isPreview && lockedCount > 0 ? (
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
                      accessibilityRole="button"
                      accessibilityLabel="Unlock full memory"
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
                ) : null}
                </>
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
        </Animated.View>
      </View>

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
          const original = memories.find((m) => m.id === id);
          setPendingDeleteId(null);
          setMemories((prev) => prev.filter((m) => m.id !== id));
          setTotalCount((c) => Math.max(0, c - 1));
          const result = await deleteMemoryApi(id);
          if (!result.ok) {
            if (original) {
              setMemories((prev) =>
                [...prev, original].sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
                ),
              );
            }
            setTotalCount((c) => c + 1);
            Alert.alert("Could not delete", result.error);
          }
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </Modal>
  );
}
