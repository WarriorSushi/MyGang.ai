import { Image, Pressable, Text, View } from "react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type Character,
} from "@mygang/shared";

import { bubbleBgForCharacter, personaNameColor } from "../../lib/bubble-colors";

const SITE_URL = "https://mygang.ai";

export type ChatMessage = {
  id: string;
  speaker: string;
  content: string;
  created_at: string;
  reaction?: string;
};

type MessageItemProps = {
  message: ChatMessage;
  character?: Character | null;
  customName?: string | null;
  avatarStyle: AvatarStyle;
  isUser: boolean;
  onLongPress?: () => void;
};

export function MessageItem({
  message,
  character,
  customName,
  avatarStyle,
  isUser,
  onLongPress,
}: MessageItemProps) {
  const displayName = customName ?? character?.name;
  if (isUser) {
    return (
      <View className="my-1 flex-row justify-end px-3">
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={350}
          className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2 active:opacity-90"
        >
          <Text className="text-base text-primary-foreground">{message.content}</Text>
          {message.reaction ? (
            <Text className="mt-1 text-base">{message.reaction}</Text>
          ) : null}
        </Pressable>
      </View>
    );
  }

  const avatarUrl = character
    ? `${SITE_URL}${resolveAvatarUrl(character.id, avatarStyle)}`
    : undefined;
  const bubbleBg = bubbleBgForCharacter(character?.color);
  const nameColor = personaNameColor(character?.color);
  const avatarBgColor = character?.color ?? "#555";

  return (
    <View className="my-1 flex-row items-end gap-2 px-3">
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
      <View className="max-w-[78%]">
        {displayName ? (
          <Text
            className="mb-0.5 text-[12px] font-semibold tracking-wide"
            style={{ color: nameColor }}
          >
            {displayName}
          </Text>
        ) : null}
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={350}
          style={{ backgroundColor: bubbleBg }}
          className="rounded-2xl rounded-bl-md px-4 py-2 active:opacity-90"
        >
          <Text className="text-base text-foreground">{message.content}</Text>
          {message.reaction ? (
            <Text className="mt-1 text-base">{message.reaction}</Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
