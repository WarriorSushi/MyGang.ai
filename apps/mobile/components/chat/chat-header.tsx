import { Image, Pressable, Text, View } from "react-native";
import { resolveAvatarUrl, type AvatarStyle, type CharacterCatalogEntry } from "@mygang/shared";

const SITE_URL = "https://mygang.ai";

type ChatHeaderProps = {
  characters: CharacterCatalogEntry[];
  avatarStyle: AvatarStyle;
  onSignOut?: () => void;
};

export function ChatHeader({ characters, avatarStyle, onSignOut }: ChatHeaderProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      <View className="flex-row -space-x-2">
        {characters.slice(0, 6).map((c) => {
          const url = `${SITE_URL}${resolveAvatarUrl(c.id, avatarStyle)}`;
          return (
            <View
              key={c.id}
              className="h-8 w-8 overflow-hidden rounded-full border-2 border-zinc-950 bg-zinc-800"
            >
              <Image
                source={{ uri: url }}
                className="h-full w-full"
                resizeMode="cover"
              />
            </View>
          );
        })}
      </View>
      <View className="flex-1 px-3">
        <Text className="text-sm font-bold text-white">Your gang</Text>
        <Text className="text-[10px] text-zinc-500">
          {characters.length} online
        </Text>
      </View>
      {onSignOut ? (
        <Pressable
          onPress={onSignOut}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-zinc-400">Sign out</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
