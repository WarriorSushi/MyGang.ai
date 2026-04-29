import { useEffect, useRef } from "react";
import { FlatList, View } from "react-native";
import {
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";
import { MessageItem, type ChatMessage } from "./message-item";

type MessageListProps = {
  messages: ChatMessage[];
  characters: CharacterCatalogEntry[];
  avatarStyle: AvatarStyle;
};

export function MessageList({ messages, characters, avatarStyle }: MessageListProps) {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      // Scroll to the end whenever new messages arrive.
      const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      return () => clearTimeout(t);
    }
  }, [messages.length]);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(m) => m.id}
      contentContainerClassName="py-4"
      ItemSeparatorComponent={() => <View className="h-1" />}
      renderItem={({ item }) => {
        const isUser = item.speaker === "user";
        const character = isUser
          ? null
          : characters.find((c) => c.id === item.speaker) ?? null;
        return (
          <MessageItem
            message={item}
            character={character}
            avatarStyle={avatarStyle}
            isUser={isUser}
          />
        );
      }}
    />
  );
}
