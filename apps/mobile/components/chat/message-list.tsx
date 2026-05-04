import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  type ListRenderItem,
  Platform,
  Pressable,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import {
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";
import { MessageItem, type ChatMessage, type GroupPosition } from "./message-item";

type MessageListProps = {
  messages: ChatMessage[];
  characters: CharacterCatalogEntry[];
  customNames?: Record<string, string>;
  avatarStyle: AvatarStyle;
  onMessageLongPress?: (message: ChatMessage) => void;
  onReactPress?: (message: ChatMessage, emoji: string) => void;
  onReplyPress?: (message: ChatMessage) => void;
};

const NEAR_BOTTOM_THRESHOLD = 150; // px

function getGroupPosition(
  messages: ChatMessage[],
  index: number
): { groupPosition: GroupPosition; isContinued: boolean } {
  const current = messages[index];
  const prev = index > 0 ? messages[index - 1] : null;
  const next = index < messages.length - 1 ? messages[index + 1] : null;
  const sameAsPrev = prev?.speaker === current.speaker;
  const sameAsNext = next?.speaker === current.speaker;
  let groupPosition: GroupPosition;
  if (sameAsPrev && sameAsNext) groupPosition = "middle";
  else if (sameAsPrev) groupPosition = "last";
  else if (sameAsNext) groupPosition = "first";
  else groupPosition = "single";
  return { groupPosition, isContinued: sameAsPrev };
}

export function MessageList({
  messages,
  characters,
  customNames,
  avatarStyle,
  onMessageLongPress,
  onReactPress,
  onReplyPress,
}: MessageListProps) {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const prevLengthRef = useRef(messages.length);

  const messagesById = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  // Stable lookup so renderItem doesn't .find() across all characters per row.
  const charactersById = useMemo(() => {
    const map = new Map<string, CharacterCatalogEntry>();
    for (const c of characters) map.set(c.id, c);
    return map;
  }, [characters]);

  // Auto-scroll to end whenever new messages arrive AND user is near the bottom.
  useEffect(() => {
    const grew = messages.length > prevLengthRef.current;
    if (grew) {
      if (isAtBottomRef.current) {
        const t = setTimeout(
          () => listRef.current?.scrollToEnd({ animated: true }),
          50
        );
        prevLengthRef.current = messages.length;
        return () => clearTimeout(t);
      }
      // User has scrolled up — bump unread count instead of forcing scroll.
      setUnreadCount((c) => c + (messages.length - prevLengthRef.current));
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const atBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
      isAtBottomRef.current = atBottom;
      setIsAtBottom((prev) => (prev !== atBottom ? atBottom : prev));
      if (atBottom) {
        setUnreadCount((c) => (c !== 0 ? 0 : c));
      }
    },
    []
  );

  const handleFabPress = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
    setUnreadCount(0);
  }, []);

  const showFab = !isAtBottom;

  const renderItem = useCallback<ListRenderItem<ChatMessage>>(
    ({ item, index }) => {
      const isUser = item.speaker === "user";
      const character = isUser
        ? null
        : charactersById.get(item.speaker) ?? null;
      const customName =
        !isUser && customNames ? customNames[item.speaker] : undefined;
      const { groupPosition, isContinued } = getGroupPosition(messages, index);
      const quotedMessage = item.replyToId
        ? messagesById.get(item.replyToId) ?? null
        : null;
      return (
        <MessageItem
          message={item}
          character={character}
          customName={customName}
          avatarStyle={avatarStyle}
          isUser={isUser}
          groupPosition={groupPosition}
          isContinued={isContinued}
          onLongPress={
            onMessageLongPress ? () => onMessageLongPress(item) : undefined
          }
          onReactPress={onReactPress}
          onReplyPress={onReplyPress}
          quotedMessage={quotedMessage}
          characters={characters}
          customNames={customNames}
        />
      );
    },
    [
      messages,
      messagesById,
      charactersById,
      characters,
      customNames,
      avatarStyle,
      onMessageLongPress,
      onReactPress,
      onReplyPress,
    ],
  );

  return (
    <View className="flex-1">
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerClassName="py-4"
        ItemSeparatorComponent={() => <View className="h-1" />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={11}
        onContentSizeChange={() => {
          if (isAtBottomRef.current) {
            listRef.current?.scrollToEnd({ animated: false });
          }
        }}
        renderItem={renderItem}
      />
      {showFab ? (
        <Pressable
          onPress={handleFabPress}
          accessibilityRole="button"
          accessibilityLabel="Scroll to latest"
          className="absolute bottom-24 right-4 h-11 w-11 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <ChevronDown size={20} color="#ffffff" />
          {unreadCount > 0 ? (
            <View className="absolute -right-1 -top-1 min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1">
              <Text className="text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}
