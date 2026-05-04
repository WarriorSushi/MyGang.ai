import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  CHARACTERS,
  applyAvatarStyleToGang,
  DEFAULT_AVATAR_STYLE,
  getContextLimit,
  getTierFromProfile,
  type AvatarStyle,
  type CharacterCatalogEntry,
  type ChatWallpaper,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import {
  postChat,
  postRenderedEvents,
  generateMessageId,
  type ChatRequestMessage,
} from "../../lib/chat-api";
import {
  loadPersistedMessages,
  savePersistedMessages,
} from "../../lib/chat-storage";
import { fetchRecentChatHistory } from "../../lib/chat-history";
import { MessageList } from "../../components/chat/message-list";
import { ChatInput } from "../../components/chat/chat-input";
import { ChatHeader } from "../../components/chat/chat-header";
import { AiDisclaimer } from "../../components/chat/ai-disclaimer";
import { EmptyState } from "../../components/chat/empty-state";
import { TypingIndicator } from "../../components/chat/typing-indicator";
import { MessageActionsSheet } from "../../components/chat/message-actions-sheet";
import { AvatarLightbox } from "../../components/chat/avatar-lightbox";
import { WallpaperBackground } from "../../components/chat/wallpaper-background";
import { SettingsDrawer } from "../../components/chat/settings-drawer";
import { MemoryVaultDrawer } from "../../components/chat/memory-vault-drawer";
import { type ChatMessage } from "../../components/chat/message-item";

export default function ChatScreen() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [typingCharacterId, setTypingCharacterId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [lightboxCharacter, setLightboxCharacter] =
    useState<CharacterCatalogEntry | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryVaultOpen, setMemoryVaultOpen] = useState(false);
  const [showResumedPill, setShowResumedPill] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Hydrate persisted chat history once we know the user.
  // Strategy: AsyncStorage first (instant), then fetch from Supabase
  // chat_history (cross-device source of truth) and replace if server
  // has data. Falls back gracefully if either fails.
  useEffect(() => {
    let mounted = true;
    if (!user?.id) {
      setHasHydrated(true);
      return;
    }
    userIdRef.current = user.id;

    (async () => {
      const cached = await loadPersistedMessages(user.id);
      if (mounted && cached.length > 0) {
        setMessages(cached);
      }

      const server = await fetchRecentChatHistory(user.id);
      if (!mounted) return;
      if (server.length > 0) {
        setMessages(server);
      }
      setHasHydrated(true);
      // Surface a "Resumed your last session" pill if any source delivered messages.
      if (cached.length > 0 || server.length > 0) {
        setShowResumedPill(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Persist messages whenever they change (post-hydration only)
  useEffect(() => {
    if (!hasHydrated || !user?.id) return;
    void savePersistedMessages(user.id, messages);
  }, [messages, user?.id, hasHydrated]);

  // Auto-dismiss the "Resumed your last session" pill after ~6s.
  useEffect(() => {
    if (!showResumedPill) return;
    const t = setTimeout(() => setShowResumedPill(false), 6000);
    return () => clearTimeout(t);
  }, [showResumedPill]);

  const avatarStyle: AvatarStyle =
    (profile?.avatar_style_preference as AvatarStyle) ?? DEFAULT_AVATAR_STYLE;
  const wallpaper: ChatWallpaper =
    (profile?.chat_wallpaper as ChatWallpaper) ?? "default";

  const allCharacters: CharacterCatalogEntry[] = useMemo(
    () =>
      applyAvatarStyleToGang(
        CHARACTERS as CharacterCatalogEntry[],
        avatarStyle
      ) as CharacterCatalogEntry[],
    [avatarStyle]
  );

  const gangIds = useMemo<string[]>(() => {
    const raw = profile?.preferred_squad;
    if (Array.isArray(raw)) {
      return raw.filter((id): id is string => typeof id === "string");
    }
    return [];
  }, [profile?.preferred_squad]);

  const gang = useMemo(
    () => allCharacters.filter((c) => gangIds.includes(c.id)),
    [allCharacters, gangIds]
  );

  // Render incoming events with their delay timing.
  // - "typing_ghost" events show "X is typing..." for `delay` ms.
  // - "message" events append the message after `delay` ms.
  // - other event types (reactions, status_update, nickname_update) deferred.
  const scheduleEvents = useCallback(
    (events: { type: string; character: string; content?: string; delay: number; message_id?: string }[]) => {
      let cumulative = 0;
      events.forEach((event) => {
        const eventDelay = Math.max(0, event.delay);
        const fireAt = cumulative;
        cumulative += eventDelay;

        if (event.type === "typing_ghost") {
          // Show typing indicator at fireAt, hide it when the next event starts.
          setTimeout(() => setTypingCharacterId(event.character), fireAt);
        } else if (event.type === "message" && event.content) {
          setTimeout(() => {
            setTypingCharacterId(null);
            setMessages((prev) => [
              ...prev,
              {
                id: event.message_id ?? generateMessageId(),
                speaker: event.character,
                content: event.content!,
                created_at: new Date().toISOString(),
              },
            ]);
          }, cumulative);
        }
      });
      // Re-enable input after the last event lands
      setTimeout(() => {
        setTypingCharacterId(null);
        setIsWaiting(false);
      }, cumulative + 100);
    },
    []
  );

  // Free tier cannot use ecosystem mode (server returns 403). Mirror the web
  // guard at auth-manager.tsx:65 — clamp to gang_focus unless tier is paid.
  const tier = (profile?.subscription_tier ?? "free") as string;
  const rawChatMode = (profile?.chat_mode as "gang_focus" | "ecosystem") ?? "gang_focus";
  const chatMode: "gang_focus" | "ecosystem" =
    tier === "free" ? "gang_focus" : rawChatMode;
  const lowCostMode = Boolean(profile?.low_cost_mode);

  const sendChatPayload = useCallback(
    async (extraMessage: ChatMessage | null) => {
      const tierForLimit = getTierFromProfile(
        profile?.subscription_tier ?? null
      );
      const contextLimit = getContextLimit(tierForLimit);
      const baseMessages = extraMessage ? [...messages, extraMessage] : messages;
      // Keep the most recent contextLimit messages (mirrors web behaviour).
      const cappedMessages = baseMessages.slice(-contextLimit);
      const apiMessages: ChatRequestMessage[] = cappedMessages.map((m) => ({
        id: m.id,
        speaker: m.speaker,
        content: m.content,
        created_at: m.created_at,
        ...(m.reaction ? { reaction: m.reaction } : {}),
        ...(m.replyToId ? { replyToId: m.replyToId } : {}),
      }));

      return postChat({
        messages: apiMessages,
        activeGangIds: gangIds,
        userName: profile?.username ?? null,
        chatMode,
        lowCostMode,
      });
    },
    [
      messages,
      gangIds,
      profile?.username,
      profile?.subscription_tier,
      chatMode,
      lowCostMode,
    ]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (isWaiting) return;
      // User taking action — dismiss the resumed-session pill immediately.
      setShowResumedPill(false);
      const userMsg: ChatMessage = {
        id: generateMessageId(),
        speaker: "user",
        content: text,
        created_at: new Date().toISOString(),
        ...(replyTarget ? { replyToId: replyTarget.id } : {}),
      };
      setMessages((prev) => [...prev, userMsg]);
      setReplyTarget(null);
      setIsWaiting(true);

      const result = await sendChatPayload(userMsg);

      if (!result.ok) {
        console.warn(
          `[chat] send failed status=${result.status} message=${result.message}`,
        );
        if (result.status === 402 && result.cooldownSeconds) {
          Alert.alert(
            "Message limit reached",
            `Try again in ${Math.ceil(result.cooldownSeconds / 60)} min, or upgrade for more messages.`
          );
        } else if (result.status === 429) {
          Alert.alert(
            "Slow down a sec",
            "Free tier is 25 messages per hour. Take a breather and try again, or upgrade for more.",
          );
        } else {
          Alert.alert("Send failed", `${result.message} (HTTP ${result.status})`);
        }
        setIsWaiting(false);
        return;
      }

      // If the server returns ok but with zero events, the gang isn't actually
      // going to respond — surface this so the user isn't waiting on nothing.
      if (!result.data.events || result.data.events.length === 0) {
        console.warn("[chat] server returned 0 events — no AI reply scheduled");
        Alert.alert(
          "Your gang's quiet",
          "The server accepted your message but didn't generate a reply. Try again in a moment.",
        );
        setIsWaiting(false);
        return;
      }

      scheduleEvents(result.data.events);

      // Persist AI-rendered events to chat_history so they survive app reloads.
      // /api/chat only persists the user's message — AI events are ephemeral
      // until we POST them back via /api/chat/rendered. Web does this; mobile
      // wasn't, which caused AI replies to vanish on every app restart.
      // Fire-and-forget: failures are logged in postRenderedEvents but don't
      // block the chat UX (the local AsyncStorage cache still holds the messages
      // for this session — only cross-session restoration was broken).
      const renderedAtBase = Date.now();
      const renderedEvents = result.data.events
        .filter(
          (e) =>
            e.type === "message" &&
            typeof e.content === "string" &&
            e.content.length > 0 &&
            typeof e.message_id === "string" &&
            e.message_id.length > 0,
        )
        .map((e, i) => ({
          message_id: e.message_id!,
          speaker: e.character,
          content: e.content!,
          // Stagger by index so chat_history sorts these in event order
          // even if multiple messages share the same wall-clock second.
          displayed_at: new Date(renderedAtBase + i).toISOString(),
        }));
      if (renderedEvents.length > 0) {
        void postRenderedEvents({
          turnId: generateMessageId(),
          events: renderedEvents,
        });
      }
    },
    [isWaiting, sendChatPayload, scheduleEvents, replyTarget]
  );

  const handleCopy = useCallback(async (msg: ChatMessage) => {
    await Clipboard.setStringAsync(msg.content);
  }, []);

  const handleReact = useCallback(
    async (msg: ChatMessage, emoji: string) => {
      // Update the local message with the reaction
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, reaction: emoji } : m))
      );
    },
    []
  );

  // Stable handlers for MessageList — inline arrows would force renderItem to
  // recreate every parent re-render, which thrashes FlatList visible-window updates.
  const handleMessageLongPress = useCallback(
    (m: ChatMessage) => setActionMessage(m),
    [],
  );
  const handleReplyPress = useCallback(
    (m: ChatMessage) => setReplyTarget(m),
    [],
  );
  const handleReactPress = useCallback(
    (m: ChatMessage, emoji: string) => {
      void handleReact(m, emoji);
    },
    [handleReact],
  );

  const replyChipProps = replyTarget
    ? {
        speaker: replyTarget.speaker,
        content: replyTarget.content,
        speakerName:
          replyTarget.speaker === "user"
            ? "yourself"
            : (profile?.custom_character_names as Record<string, string> | null)?.[
                replyTarget.speaker
              ] ??
              allCharacters.find((c) => c.id === replyTarget.speaker)?.name ??
              replyTarget.speaker,
        speakerColor:
          replyTarget.speaker === "user"
            ? "#3eddc0"
            : allCharacters.find((c) => c.id === replyTarget.speaker)?.color ??
              "#a1a1aa",
      }
    : null;

  // If we somehow got here without a gang, show a helpful state instead of an empty chat.
  if (gang.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ChatHeader
          characters={[]}
          avatarStyle={avatarStyle}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenMemoryVault={() => setMemoryVaultOpen(true)}
          isTyping={typingCharacterId !== null}
        />
        <EmptyState
          gang={[]}
          avatarStyle={avatarStyle}
          username={profile?.username ?? null}
        />
        {settingsOpen ? (
          <SettingsDrawer
            visible
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
        {memoryVaultOpen ? (
          <MemoryVaultDrawer
            visible
            onClose={() => setMemoryVaultOpen(false)}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <WallpaperBackground wallpaper={wallpaper}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ChatHeader
            characters={gang}
            avatarStyle={avatarStyle}
            onAvatarPress={(c) => setLightboxCharacter(c)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenMemoryVault={() => setMemoryVaultOpen(true)}
            isTyping={typingCharacterId !== null}
            onRefresh={async () => {
              if (!user?.id) return;
              const server = await fetchRecentChatHistory(user.id);
              if (server.length > 0) setMessages(server);
            }}
          />
        <View className="flex-1">
          {showResumedPill && messages.length > 0 ? (
            <View className="self-center mt-3 mb-1 rounded-full border border-border bg-card-translucent px-3 py-1.5">
              <Text className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                RESUMED YOUR LAST SESSION
              </Text>
            </View>
          ) : null}
          {messages.length === 0 && hasHydrated ? (
            <EmptyState
              gang={gang}
              avatarStyle={avatarStyle}
              username={profile?.username ?? null}
            />
          ) : (
            <MessageList
              messages={messages}
              characters={allCharacters}
              customNames={
                (profile?.custom_character_names as Record<string, string> | null) ??
                undefined
              }
              avatarStyle={avatarStyle}
              onMessageLongPress={handleMessageLongPress}
              onReactPress={handleReactPress}
              onReplyPress={handleReplyPress}
            />
          )}
          {typingCharacterId
            ? (() => {
                const c = allCharacters.find((x) => x.id === typingCharacterId);
                if (!c) return null;
                const customName =
                  (profile?.custom_character_names as Record<string, string> | null)
                    ?.[typingCharacterId] ?? undefined;
                return (
                  <TypingIndicator
                    character={c}
                    customName={customName}
                    avatarStyle={avatarStyle}
                  />
                );
              })()
            : null}
        </View>
        {/* Bottom area gets its own SafeAreaView with edges=["bottom"] so the
            input + disclaimer sit ABOVE the Android nav bar in edge-to-edge
            mode. The outer SafeAreaView intentionally excludes "bottom" so
            the wallpaper still draws under the nav bar — this nested one
            applies the system inset only to the input wrapper. */}
        <SafeAreaView edges={["bottom"]}>
          <ChatInput
            onSend={handleSend}
            disabled={isWaiting}
            replyTarget={replyChipProps}
            onCancelReply={() => setReplyTarget(null)}
          />
          <AiDisclaimer />
        </SafeAreaView>
        </KeyboardAvoidingView>
      </WallpaperBackground>

      <MessageActionsSheet
        visible={actionMessage !== null}
        onClose={() => setActionMessage(null)}
        onCopy={() => {
          if (actionMessage) void handleCopy(actionMessage);
        }}
        onReact={(emoji) => {
          if (actionMessage) void handleReact(actionMessage, emoji);
        }}
        canReact={actionMessage !== null && actionMessage.speaker !== "user"}
        onReply={() => {
          if (actionMessage) setReplyTarget(actionMessage);
        }}
      />

      <AvatarLightbox
        character={lightboxCharacter}
        customName={
          lightboxCharacter
            ? (profile?.custom_character_names as Record<string, string> | null)?.[
                lightboxCharacter.id
              ] ?? null
            : null
        }
        avatarStyle={avatarStyle}
        onClose={() => setLightboxCharacter(null)}
      />

      {settingsOpen ? (
        <SettingsDrawer
          visible
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {memoryVaultOpen ? (
        <MemoryVaultDrawer
          visible
          onClose={() => setMemoryVaultOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}
