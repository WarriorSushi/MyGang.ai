import { memo, useMemo } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Heart, RefreshCcw, Reply } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type Character,
} from "@mygang/shared";

import { bubbleBgForCharacter, personaNameColor } from "../../lib/bubble-colors";
import { splitMessageLinks } from "../../lib/message-links";

const SITE_URL = "https://mygang.ai";
const HEART_EMOJI = "❤️"; // ❤️

export type GroupPosition = "single" | "first" | "middle" | "last";

export type ChatMessage = {
  id: string;
  speaker: string;
  content: string;
  created_at: string;
  reaction?: string;
  replyToId?: string;
  source?: "chat" | "wywa" | "system";
  deliveryStatus?: "sending" | "sent" | "failed";
  deliveryError?: string;
};

type MessageItemProps = {
  message: ChatMessage;
  character?: Character | null;
  customName?: string | null;
  avatarStyle: AvatarStyle;
  isUser: boolean;
  groupPosition?: GroupPosition;
  isContinued?: boolean;
  onLongPress?: () => void;
  onReactPress?: (message: ChatMessage, emoji: string) => void;
  onReplyPress?: (message: ChatMessage) => void;
  onRetryPress?: (message: ChatMessage) => void;
  quotedMessage?: ChatMessage | null;
  quotedSpeakerColor?: string | null;
  quotedSpeakerName?: string | null;
};

const ROUND = 18;
const TIGHT = 5;

type BubbleRadii = {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
};

function getBubbleRadii(position: GroupPosition, isUser: boolean): BubbleRadii {
  if (isUser) {
    // Right-side corners collapse on group continuations
    switch (position) {
      case "single":
        return {
          borderTopLeftRadius: ROUND,
          borderTopRightRadius: ROUND,
          borderBottomLeftRadius: ROUND,
          borderBottomRightRadius: TIGHT,
        };
      case "first":
        return {
          borderTopLeftRadius: ROUND,
          borderTopRightRadius: ROUND,
          borderBottomLeftRadius: ROUND,
          borderBottomRightRadius: TIGHT,
        };
      case "middle":
        return {
          borderTopLeftRadius: ROUND,
          borderTopRightRadius: TIGHT,
          borderBottomLeftRadius: ROUND,
          borderBottomRightRadius: TIGHT,
        };
      case "last":
        return {
          borderTopLeftRadius: ROUND,
          borderTopRightRadius: TIGHT,
          borderBottomLeftRadius: ROUND,
          borderBottomRightRadius: ROUND,
        };
    }
  }
  // AI bubble: left-side corners collapse on group continuations
  switch (position) {
    case "single":
      return {
        borderTopLeftRadius: ROUND,
        borderTopRightRadius: ROUND,
        borderBottomLeftRadius: TIGHT,
        borderBottomRightRadius: ROUND,
      };
    case "first":
      return {
        borderTopLeftRadius: ROUND,
        borderTopRightRadius: ROUND,
        borderBottomLeftRadius: TIGHT,
        borderBottomRightRadius: ROUND,
      };
    case "middle":
      return {
        borderTopLeftRadius: TIGHT,
        borderTopRightRadius: ROUND,
        borderBottomLeftRadius: TIGHT,
        borderBottomRightRadius: ROUND,
      };
    case "last":
      return {
        borderTopLeftRadius: TIGHT,
        borderTopRightRadius: ROUND,
        borderBottomLeftRadius: ROUND,
        borderBottomRightRadius: ROUND,
      };
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m.toString().padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = diffSec / 60;
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
  const diffH = diffMin / 60;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  const diffD = diffH / 24;
  return `${Math.floor(diffD)}d ago`;
}

function MessageItemBase({
  message,
  character,
  customName,
  avatarStyle,
  isUser,
  groupPosition = "single",
  isContinued = false,
  onLongPress,
  onReactPress,
  onReplyPress,
  onRetryPress,
  quotedMessage,
  quotedSpeakerColor,
  quotedSpeakerName,
}: MessageItemProps) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "light" ? "light" : "dark";
  const radii = useMemo(
    () => getBubbleRadii(groupPosition, isUser),
    [groupPosition, isUser],
  );
  // Memoize date formatting: created_at is stable per message, and these
  // string ops add up across 50+ rows during virtualized re-renders.
  // The relative label intentionally won't live-update — we already accept that.
  const timeLabel = useMemo(
    () => formatTime(message.created_at),
    [message.created_at],
  );
  const relativeLabel = useMemo(
    () => formatRelative(message.created_at),
    [message.created_at],
  );
  const isHearted = message.reaction === HEART_EMOJI;
  const isFailed = message.deliveryStatus === "failed";
  const isSending = message.deliveryStatus === "sending";
  const contentParts = useMemo(
    () => splitMessageLinks(message.content),
    [message.content],
  );

  const renderedContent = contentParts.map((part, index) =>
    part.type === "text" ? (
      part.value
    ) : (
      <Text
        key={`${part.url}-${index}`}
        className="font-semibold underline"
        accessibilityRole="link"
        accessibilityLabel={`Open link ${part.value}`}
        onPress={() => {
          void Linking.openURL(part.url).catch(() => {
            Alert.alert("Couldn't open link", "The link could not be opened on this device.");
          });
        }}
      >
        {part.value}
      </Text>
    ),
  );

  const quotedColor = quotedMessage ? quotedSpeakerColor : null;
  const quotedName = quotedMessage ? quotedSpeakerName : null;
  const quotedBlock =
    quotedMessage && quotedColor && quotedName ? (
      <View
        className="mb-2 overflow-hidden rounded-lg border-l-2 pl-2 py-1"
        style={{ borderLeftColor: quotedColor }}
      >
        <Text
          className="text-[10px] font-bold"
          style={{ color: quotedColor }}
          numberOfLines={1}
        >
          {quotedName}
        </Text>
        <Text
          className="text-[11px] text-muted-foreground/80"
          numberOfLines={2}
        >
          {quotedMessage.content}
        </Text>
      </View>
    ) : null;

  const handleHeartPress = () => {
    if (!onReactPress) return;
    // Toggle: if already hearted, clear; else set to heart.
    onReactPress(message, isHearted ? "" : HEART_EMOJI);
  };
  const handleReplyPress = () => {
    onReplyPress?.(message);
  };

  const inlineActionsRow = (
    <View
      className={`mt-1 flex-row items-center gap-3 px-1 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <Pressable
        onPress={handleHeartPress}
        className="h-11 w-11 items-center justify-center rounded-full active:bg-muted/50"
        accessibilityRole="button"
        accessibilityLabel={isHearted ? "Remove heart" : "Heart message"}
      >
        <Heart
          size={14}
          color={isHearted ? "#ef4444" : "rgba(148,163,184,0.7)"}
          fill={isHearted ? "#ef4444" : "transparent"}
        />
      </Pressable>
      <Pressable
        onPress={handleReplyPress}
        className="h-11 w-11 items-center justify-center rounded-full active:bg-muted/50"
        accessibilityRole="button"
        accessibilityLabel="Reply"
      >
        <Reply size={14} color="rgba(148,163,184,0.7)" />
      </Pressable>
    </View>
  );

  if (isUser) {
    return (
      <View className="my-1 flex-col items-end px-3">
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={350}
          style={{ ...radii, maxWidth: 560 }}
          className={`max-w-[80%] px-4 py-2 active:opacity-90 ${
            isSending ? "bg-muted" : "bg-primary"
          }`}
        >
          {quotedBlock}
          <Text
            className={`text-base ${
              isSending ? "text-muted-foreground" : "text-primary-foreground"
            }`}
          >
            {renderedContent}
          </Text>
          {message.reaction ? (
            <Text className="mt-1 text-base">{message.reaction}</Text>
          ) : null}
        </Pressable>
        {inlineActionsRow}
        <View className="mt-1 flex-row items-baseline gap-1 px-1">
          <Text className="text-[10px] text-muted-foreground/60">{timeLabel}</Text>
          {relativeLabel ? (
            <>
              <Text className="text-[10px] text-muted-foreground/40"> </Text>
              <Text className="text-[10px] text-muted-foreground/60">
                {relativeLabel}
              </Text>
            </>
          ) : null}
        </View>
        {isSending ? (
          <Text className="mt-1 px-1 text-[10px] text-muted-foreground/70">
            Sending...
          </Text>
        ) : null}
        {isFailed ? (
          <View className="mt-1 flex-row items-center gap-2 px-1">
            <Text
              className="flex-1 text-[10px] text-destructive"
              numberOfLines={1}
            >
              {message.deliveryError ?? "Failed to send"}
            </Text>
            <Pressable
              onPress={() => onRetryPress?.(message)}
              className="min-h-11 flex-row items-center gap-1 rounded-full border border-destructive/30 px-3 active:bg-destructive/10"
              accessibilityRole="button"
              accessibilityLabel="Retry failed message"
            >
              <RefreshCcw size={12} color="#f87171" strokeWidth={2.5} />
              <Text className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  const displayName = customName ?? character?.name ?? message.speaker;
  const avatarUrl = character
    ? `${SITE_URL}${resolveAvatarUrl(character.id, avatarStyle)}`
    : undefined;
  const bubbleBg = bubbleBgForCharacter(character?.color, scheme);
  const nameColor = personaNameColor(character?.color, scheme);
  const avatarBgColor = character?.color ?? "#555";
  const showHeader = !isContinued; // first or single
  const showAvatar = showHeader; // hide on middle/last
  const archetypeLabel = character?.roleLabel ?? character?.archetype ?? null;

  return (
    <View className="my-1 flex-row items-end gap-2 px-3">
      {showAvatar ? (
        <View
          className="h-8 w-8 overflow-hidden rounded-full"
          style={{ backgroundColor: avatarBgColor }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : null}
        </View>
      ) : (
        <View className="h-8 w-8" />
      )}
      <View className="max-w-[78%]" style={{ maxWidth: 560 }}>
        {showHeader ? (
          <View className="mb-1 flex-row items-baseline gap-1.5">
            <Text
              className="text-xs font-bold tracking-wide"
              style={{ color: nameColor }}
            >
              {displayName}
            </Text>
            {archetypeLabel ? (
              <Text className="text-[10px] italic text-muted-foreground/80">
                {archetypeLabel}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={350}
          style={{ backgroundColor: bubbleBg, ...radii }}
          className="px-4 py-2 active:opacity-90"
        >
          {quotedBlock}
          <Text className="text-base text-foreground">{renderedContent}</Text>
          {message.reaction ? (
            <Text className="mt-1 text-base">{message.reaction}</Text>
          ) : null}
        </Pressable>
        {inlineActionsRow}
        <View className="mt-1 flex-row items-baseline gap-1 px-1">
          <Text className="text-[10px] text-muted-foreground/60">{timeLabel}</Text>
          {relativeLabel ? (
            <>
              <Text className="text-[10px] text-muted-foreground/40"> </Text>
              <Text className="text-[10px] text-muted-foreground/60">
                {relativeLabel}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// Custom equality: re-render only when meaningful inputs change.
// Handler-prop identity changes are intentionally ignored — handlers are
// forwarded but rarely produce different visuals, and the parent recreates
// them on every render.
function arePropsEqual(prev: MessageItemProps, next: MessageItemProps): boolean {
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.content !== next.message.content) return false;
  if (prev.message.reaction !== next.message.reaction) return false;
  if (prev.message.replyToId !== next.message.replyToId) return false;
  if (prev.message.source !== next.message.source) return false;
  if (prev.message.deliveryStatus !== next.message.deliveryStatus) return false;
  if (prev.message.deliveryError !== next.message.deliveryError) return false;
  if (prev.message.created_at !== next.message.created_at) return false;
  if (prev.groupPosition !== next.groupPosition) return false;
  if (prev.isContinued !== next.isContinued) return false;
  if (prev.isUser !== next.isUser) return false;
  if (prev.avatarStyle !== next.avatarStyle) return false;
  if (prev.customName !== next.customName) return false;
  if (prev.character?.id !== next.character?.id) return false;
  // Quoted message: compare by id + content (the only fields rendered).
  const prevQ = prev.quotedMessage;
  const nextQ = next.quotedMessage;
  if (prevQ?.id !== nextQ?.id) return false;
  if (prevQ?.content !== nextQ?.content) return false;
  if (prevQ?.speaker !== nextQ?.speaker) return false;
  if (prev.quotedSpeakerColor !== next.quotedSpeakerColor) return false;
  if (prev.quotedSpeakerName !== next.quotedSpeakerName) return false;
  return true;
}

export const MessageItem = memo(MessageItemBase, arePropsEqual);
