import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { resolveAvatarUrl, type AvatarStyle, type CharacterCatalogEntry } from "@mygang/shared";

const SITE_URL = "https://mygang.ai";

type ChatHeaderProps = {
  characters: CharacterCatalogEntry[];
  avatarStyle: AvatarStyle;
  onAvatarPress?: (character: CharacterCatalogEntry) => void;
};

export function ChatHeader({
  characters,
  avatarStyle,
  onAvatarPress,
}: ChatHeaderProps) {
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between border-b border-border bg-background px-4 py-3">
      <View className="flex-row -space-x-2">
        {characters.slice(0, 6).map((c) => {
          const url = `${SITE_URL}${resolveAvatarUrl(c.id, avatarStyle)}`;
          return (
            <Pressable
              key={c.id}
              onPress={() => onAvatarPress?.(c)}
              className="h-8 w-8 overflow-hidden rounded-full border-2 border-background bg-muted"
            >
              <Image
                source={{ uri: url }}
                className="h-full w-full"
                resizeMode="cover"
              />
            </Pressable>
          );
        })}
      </View>
      <View className="flex-1 px-3">
        <Text className="text-sm font-bold text-foreground">Your gang</Text>
        <Text className="text-[10px] text-muted-foreground/70">
          {characters.length} online
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/(app)/settings")}
        className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card"
      >
        <Text className="text-base text-muted-foreground">⚙</Text>
      </Pressable>
    </View>
  );
}
