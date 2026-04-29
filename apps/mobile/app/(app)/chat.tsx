import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CHARACTERS,
  applyAvatarStyleToGang,
  DEFAULT_AVATAR_STYLE,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import {
  postChat,
  generateMessageId,
  type ChatRequestMessage,
} from "../../lib/chat-api";
import {
  loadPersistedMessages,
  savePersistedMessages,
  clearPersistedMessages,
} from "../../lib/chat-storage";
import { MessageList } from "../../components/chat/message-list";
import { ChatInput } from "../../components/chat/chat-input";
import { ChatHeader } from "../../components/chat/chat-header";
import { type ChatMessage } from "../../components/chat/message-item";

export default function ChatScreen() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
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

  // Render incoming events as messages with their delay timing
  const scheduleEvents = useCallback(
    (events: { type: string; character: string; content?: string; delay: number; message_id?: string }[]) => {
      let cumulative = 0;
      events.forEach((event) => {
        cumulative += Math.max(0, event.delay);
        if (event.type === "message" && event.content) {
          setTimeout(() => {
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
        // Reactions and other event types are deferred for now.
      });
      // Re-enable input after the last event lands
      setTimeout(() => setIsWaiting(false), cumulative + 100);
    },
    []
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

      const apiMessages: ChatRequestMessage[] = [...messages, userMsg].map(
        (m) => ({
          id: m.id,
          speaker: m.speaker,
          content: m.content,
          created_at: m.created_at,
        })
      );

      const result = await postChat({
        messages: apiMessages,
        activeGangIds: gangIds,
        userName: profile?.username ?? null,
        chatMode: "gang_focus",
      });

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
    [isWaiting, messages, gangIds, profile?.username, scheduleEvents]
  );

  const handleSignOut = useCallback(() => {
    // Clear locally cached messages so the next signed-in user doesn't see them
    if (userIdRef.current) {
      void clearPersistedMessages(userIdRef.current);
    }
    void supabase.auth.signOut();
  }, []);

  // If we somehow got here without a gang, show a helpful state instead of an empty chat.
  if (gang.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-zinc-950 px-6">
        <View className="items-center">
          <ChatHeader
            characters={[]}
            avatarStyle={avatarStyle}
            onSignOut={handleSignOut}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ChatHeader
          characters={gang}
          avatarStyle={avatarStyle}
          onSignOut={handleSignOut}
        />
        <View className="flex-1">
          <MessageList
            messages={messages}
            characters={allCharacters}
            customNames={
              (profile?.custom_character_names as Record<string, string> | null) ??
              undefined
            }
            avatarStyle={avatarStyle}
          />
        </View>
        <ChatInput onSend={handleSend} disabled={isWaiting} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
