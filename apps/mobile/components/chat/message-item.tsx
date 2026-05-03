import { Image, Pressable, Text, View } from "react-native";
import { Heart, Reply } from "lucide-react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type Character,
  type CharacterCatalogEntry,
} from "@mygang/shared";

import { bubbleBgForCharacter, personaNameColor } from "../../lib/bubble-colors";

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
  quotedMessage?: ChatMessage | null;
  characters?: CharacterCatalogEntry[];
  customNames?: Record<string, string>;
};

function getQuotedSpeakerColor(
  msg: ChatMessage,
  characters: CharacterCatalogEntry[] | undefined,
): string {
  if (msg.speaker === "user") return "#3eddc0";
  return characters?.find((c) => c.id === msg.speaker)?.color ?? "#a1a1aa";
}

function getQuotedSpeakerName(
  msg: ChatMessage,
  characters: CharacterCatalogEntry[] | undefined,
  customNames?: Record<string, string>,
): string {
  if (msg.speaker === "user") return "You";
  const char = characters?.find((c) => c.id === msg.speaker);
  return customNames?.[msg.speaker] ?? char?.name ?? msg.speaker;
}

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

export function MessageItem({
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
  quotedMessage,
  characters,
  customNames,
}: MessageItemProps) {
  const radii = getBubbleRadii(groupPosition, isUser);
  const timeLabel = formatTime(message.created_at);
  const relativeLabel = formatRelative(message.created_at);
  const isHearted = message.reaction === HEART_EMOJI;

  const quotedColor = quotedMessage
    ? getQuotedSpeakerColor(quotedMessage, characters)
    : null;
  const quotedName = quotedMessage
    ? getQuotedSpeakerName(quotedMessage, characters, customNames)
    : null;
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
    if (onReplyPress) {
      onReplyPress(message);
      return;
    }
    // eslint-disable-next-line no-console
    console.warn("[MessageItem] reply pressed but onReplyPress not wired", message.id);
  };

  const inlineActionsRow = (
    <View
      className={`mt-1 flex-row items-center gap-3 px-1 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <Pressable
        onPress={handleHeartPress}
        hitSlop={8}
        className="active:opacity-60"
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
        hitSlop={8}
        className="active:opacity-60"
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
          style={radii}
          className="max-w-[80%] bg-primary px-4 py-2 active:opacity-90"
        >
          {quotedBlock}
          <Text className="text-base text-primary-foreground">{message.content}</Text>
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
    );
  }

  const displayName = customName ?? character?.name ?? message.speaker;
  const avatarUrl = character
    ? `${SITE_URL}${resolveAvatarUrl(character.id, avatarStyle)}`
    : undefined;
  const bubbleBg = bubbleBgForCharacter(character?.color);
  const nameColor = personaNameColor(character?.color);
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
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : null}
        </View>
      ) : (
        <View className="h-8 w-8" />
      )}
      <View className="max-w-[78%]">
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
          <Text className="text-base text-foreground">{message.content}</Text>
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
