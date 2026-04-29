import { Image, Text, View } from "react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type Character,
} from "@mygang/shared";

const SITE_URL = "https://mygang.ai";

export type ChatMessage = {
  id: string;
  speaker: string;
  content: string;
  created_at: string;
};

type MessageItemProps = {
  message: ChatMessage;
  character?: Character | null;
  customName?: string | null;
  avatarStyle: AvatarStyle;
  isUser: boolean;
};

export function MessageItem({
  message,
  character,
  customName,
  avatarStyle,
  isUser,
}: MessageItemProps) {
  const displayName = customName ?? character?.name;
  if (isUser) {
    return (
      <View className="my-1 flex-row justify-end px-3">
        <View className="max-w-[80%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-2">
          <Text className="text-base text-white">{message.content}</Text>
        </View>
      </View>
    );
  }

  const avatarUrl = character
    ? `${SITE_URL}${resolveAvatarUrl(character.id, avatarStyle)}`
    : undefined;

  return (
    <View className="my-1 flex-row items-end gap-2 px-3">
      <View className="h-8 w-8 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
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
          <Text className="mb-0.5 text-[11px] font-semibold text-zinc-500">
            {displayName}
          </Text>
        ) : null}
        <View className="rounded-2xl rounded-bl-md bg-zinc-800 px-4 py-2">
          <Text className="text-base text-white">{message.content}</Text>
        </View>
      </View>
    </View>
  );
}
