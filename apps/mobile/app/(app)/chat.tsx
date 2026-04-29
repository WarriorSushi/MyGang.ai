import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  CHARACTERS,
  applyAvatarStyleToGang,
  DEFAULT_AVATAR_STYLE,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import {
  postChat,
  generateMessageId,
  type ChatRequestMessage,
} from "../../lib/chat-api";
import {
  loadPersistedMessages,
  savePersistedMessages,
} from "../../lib/chat-storage";
import { MessageList } from "../../components/chat/message-list";
import { ChatInput } from "../../components/chat/chat-input";
import { ChatHeader } from "../../components/chat/chat-header";
import { AiDisclaimer } from "../../components/chat/ai-disclaimer";
import { EmptyState } from "../../components/chat/empty-state";
import { TypingIndicator } from "../../components/chat/typing-indicator";
import { MessageActionsSheet } from "../../components/chat/message-actions-sheet";
import { type ChatMessage } from "../../components/chat/message-item";

export default function ChatScreen() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [typingCharacterId, setTypingCharacterId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Hydrate persisted chat history once we know the user
  useEffect(() => {
    let mounted = true;
    if (!user?.id) {
      setHasHydrated(true);
      return;
    }
    userIdRef.current = user.id;
    loadPersistedMessages(user.id).then((persisted) => {
      if (!mounted) return;
      setMessages(persisted);
      setHasHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Persist messages whenever they change (post-hydration only)
  useEffect(() => {
    if (!hasHydrated || !user?.id) return;
    void savePersistedMessages(user.id, messages);
  }, [messages, user?.id, hasHydrated]);

  const avatarStyle: AvatarStyle =
    (profile?.avatar_style_preference as AvatarStyle) ?? DEFAULT_AVATAR_STYLE;

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

  const chatMode = (profile?.chat_mode as "gang_focus" | "ecosystem") ?? "gang_focus";

  const sendChatPayload = useCallback(
    async (extraMessage: ChatMessage | null) => {
      const baseMessages = extraMessage ? [...messages, extraMessage] : messages;
      const apiMessages: ChatRequestMessage[] = baseMessages.map((m) => ({
        id: m.id,
        speaker: m.speaker,
        content: m.content,
        created_at: m.created_at,
        ...(m.reaction ? { reaction: m.reaction } : {}),
      }));

      return postChat({
        messages: apiMessages,
        activeGangIds: gangIds,
        userName: profile?.username ?? null,
        chatMode,
      });
    },
    [messages, gangIds, profile?.username, chatMode]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (isWaiting) return;
      const userMsg: ChatMessage = {
        id: generateMessageId(),
        speaker: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsWaiting(true);

      const result = await sendChatPayload(userMsg);

      if (!result.ok) {
        if (result.status === 402 && result.cooldownSeconds) {
          Alert.alert(
            "Message limit reached",
            `Try again in ${Math.ceil(result.cooldownSeconds / 60)} min, or upgrade for more messages.`
          );
        } else {
          Alert.alert("Send failed", result.message);
        }
        setIsWaiting(false);
        return;
      }

      scheduleEvents(result.data.events);
    },
    [isWaiting, sendChatPayload, scheduleEvents]
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

  // If we somehow got here without a gang, show a helpful state instead of an empty chat.
  if (gang.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950">
        <ChatHeader characters={[]} avatarStyle={avatarStyle} />
        <EmptyState
          gang={[]}
          avatarStyle={avatarStyle}
          username={profile?.username ?? null}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ChatHeader characters={gang} avatarStyle={avatarStyle} />
        <View className="flex-1">
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
              onMessageLongPress={(m) => setActionMessage(m)}
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
        <ChatInput onSend={handleSend} disabled={isWaiting} />
        <AiDisclaimer />
      </KeyboardAvoidingView>

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
      />
    </SafeAreaView>
  );
}
