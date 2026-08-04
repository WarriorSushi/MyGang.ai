import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  InteractionManager,
  ActivityIndicator,
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
  onRetryPress?: (message: ChatMessage) => void;
  hasOlderMessages?: boolean;
  isLoadingOlder?: boolean;
  historyError?: string | null;
  onLoadOlder?: () => void;
  onRetryHistory?: () => void;
};

const NEAR_BOTTOM_THRESHOLD = 150; // px

type MessageRow = {
  message: ChatMessage;
  groupPosition: GroupPosition;
  isContinued: boolean;
  quotedMessage: ChatMessage | null;
  quotedSpeakerColor: string | null;
  quotedSpeakerName: string | null;
  showWywaDivider: boolean;
};

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

function MessageListBase({
  messages,
  characters,
  customNames,
  avatarStyle,
  onMessageLongPress,
  onReactPress,
  onReplyPress,
  onRetryPress,
  hasOlderMessages = false,
  isLoadingOlder = false,
  historyError = null,
  onLoadOlder,
  onRetryHistory,
}: MessageListProps) {
  const listRef = useRef<FlatList<MessageRow>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const userDraggingRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const prevLengthRef = useRef(messages.length);
  const prevFirstIdRef = useRef(messages[0]?.id ?? null);
  const prevLastIdRef = useRef(messages[messages.length - 1]?.id ?? null);

  // Stable lookup so renderItem doesn't .find() across all characters per row.
  const charactersById = useMemo(() => {
    const map = new Map<string, CharacterCatalogEntry>();
    for (const c of characters) map.set(c.id, c);
    return map;
  }, [characters]);

  const rows = useMemo<MessageRow[]>(() => {
    const messagesById = new Map<string, ChatMessage>();
    for (const message of messages) messagesById.set(message.id, message);

    return messages.map((message, index) => {
      const { groupPosition, isContinued } = getGroupPosition(messages, index);
      const quotedMessage = message.replyToId
        ? messagesById.get(message.replyToId) ?? null
        : null;

      let quotedSpeakerColor: string | null = null;
      let quotedSpeakerName: string | null = null;
      if (quotedMessage) {
        if (quotedMessage.speaker === "user") {
          quotedSpeakerColor = "#3eddc0";
          quotedSpeakerName = "You";
        } else {
          const quotedCharacter = charactersById.get(quotedMessage.speaker);
          quotedSpeakerColor = quotedCharacter?.color ?? "#a1a1aa";
          quotedSpeakerName =
            customNames?.[quotedMessage.speaker] ??
            quotedCharacter?.name ??
            quotedMessage.speaker;
        }
      }

      return {
        message,
        groupPosition,
        isContinued,
        quotedMessage,
        quotedSpeakerColor,
        quotedSpeakerName,
        showWywaDivider:
          message.source === "wywa" && messages[index - 1]?.source !== "wywa",
      };
    });
  }, [messages, charactersById, customNames]);

  useEffect(() => {
    if (rows.length === 0) {
      initialScrollDoneRef.current = false;
    }
  }, [rows.length]);

  // Auto-scroll to end whenever new messages arrive AND user is near the bottom.
  useEffect(() => {
    if (rows.length === 0 || initialScrollDoneRef.current) return;
    const run = InteractionManager.runAfterInteractions(() => {
      listRef.current?.scrollToEnd({ animated: false });
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: false });
      });
      initialScrollDoneRef.current = true;
    });
    return () => run.cancel();
  }, [rows.length]);

  useEffect(() => {
    const grew = messages.length > prevLengthRef.current;
    const currentFirstId = messages[0]?.id ?? null;
    const currentLastId = messages[messages.length - 1]?.id ?? null;
    if (grew) {
      const olderHistoryPrepended =
        prevLengthRef.current > 0 &&
        prevLastIdRef.current === currentLastId &&
        prevFirstIdRef.current !== currentFirstId;
      if (olderHistoryPrepended) {
        prevLengthRef.current = messages.length;
        prevFirstIdRef.current = currentFirstId;
        prevLastIdRef.current = currentLastId;
        return;
      }
      if (isAtBottomRef.current && !userDraggingRef.current) {
        const t = setTimeout(
          () => {
            if (!userDraggingRef.current) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          },
          50
        );
        prevLengthRef.current = messages.length;
        prevFirstIdRef.current = currentFirstId;
        prevLastIdRef.current = currentLastId;
        return () => clearTimeout(t);
      }
      // User has scrolled up — bump unread count instead of forcing scroll.
      setUnreadCount((c) => c + (messages.length - prevLengthRef.current));
    }
    prevLengthRef.current = messages.length;
    prevFirstIdRef.current = currentFirstId;
    prevLastIdRef.current = currentLastId;
  }, [messages]);

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
    userDraggingRef.current = false;
    listRef.current?.scrollToEnd({ animated: true });
    setUnreadCount(0);
  }, []);

  const showFab = !isAtBottom;

  const renderItem = useCallback<ListRenderItem<MessageRow>>(
    ({ item: row }) => {
      const item = row.message;
      const isUser = item.speaker === "user";
      const character = isUser
        ? null
        : charactersById.get(item.speaker) ?? null;
      const customName =
        !isUser && customNames ? customNames[item.speaker] : undefined;
      return (
        <>
          {row.showWywaDivider ? (
            <View className="my-3 items-center px-4">
              <View className="rounded-full border border-border bg-card-translucent px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  While you were away
                </Text>
              </View>
            </View>
          ) : null}
          <MessageItem
            message={item}
            character={character}
            customName={customName}
            avatarStyle={avatarStyle}
            isUser={isUser}
            groupPosition={row.groupPosition}
            isContinued={row.isContinued}
            onLongPress={
              onMessageLongPress ? () => onMessageLongPress(item) : undefined
            }
            onReactPress={onReactPress}
            onReplyPress={onReplyPress}
            onRetryPress={onRetryPress}
            quotedMessage={row.quotedMessage}
            quotedSpeakerColor={row.quotedSpeakerColor}
            quotedSpeakerName={row.quotedSpeakerName}
          />
        </>
      );
    },
    [
      charactersById,
      customNames,
      avatarStyle,
      onMessageLongPress,
      onReactPress,
      onReplyPress,
      onRetryPress,
    ],
  );

  const listHeader = useMemo(() => {
    if (historyError) {
      return (
        <View className="mx-4 mb-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3">
          <Text className="text-sm font-semibold text-destructive">
            Could not refresh chat history
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={2}>
            {historyError}
          </Text>
          <Pressable
            onPress={onRetryHistory}
            className="mt-3 min-h-11 self-start justify-center rounded-full border border-destructive/30 px-4 active:bg-destructive/10"
            accessibilityRole="button"
            accessibilityLabel="Retry chat history"
          >
            <Text className="text-xs font-bold uppercase tracking-wider text-destructive">
              Retry
            </Text>
          </Pressable>
        </View>
      );
    }
    if (isLoadingOlder) {
      return (
        <View className="items-center py-3">
          <ActivityIndicator color="#5eead4" />
        </View>
      );
    }
    if (hasOlderMessages && onLoadOlder) {
      return (
        <Pressable
          onPress={onLoadOlder}
          className="mx-4 mb-3 min-h-11 items-center justify-center rounded-full border border-border bg-card-translucent active:bg-muted/40"
          accessibilityRole="button"
          accessibilityLabel="Load earlier messages"
        >
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Load earlier messages
          </Text>
        </Pressable>
      );
    }
    return null;
  }, [
    hasOlderMessages,
    historyError,
    isLoadingOlder,
    onLoadOlder,
    onRetryHistory,
  ]);

  return (
    <View className="flex-1">
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.message.id}
        contentContainerClassName="py-4"
        ItemSeparatorComponent={() => <View className="h-1" />}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          userDraggingRef.current = true;
        }}
        onMomentumScrollEnd={() => {
          userDraggingRef.current = false;
        }}
        onScrollEndDrag={() => {
          userDraggingRef.current = false;
        }}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={12}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        onContentSizeChange={() => {
          if (
            (!initialScrollDoneRef.current || isAtBottomRef.current) &&
            !userDraggingRef.current
          ) {
            listRef.current?.scrollToEnd({ animated: false });
            if (rows.length > 0) initialScrollDoneRef.current = true;
          }
        }}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
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

export const MessageList = memo(MessageListBase);
