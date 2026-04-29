import { Image, Text, View } from "react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";

const SITE_URL = "https://mygang.ai";

type EmptyStateProps = {
  gang: CharacterCatalogEntry[];
  avatarStyle: AvatarStyle;
  username?: string | null;
};

export function EmptyState({ gang, avatarStyle, username }: EmptyStateProps) {
  const greeting = username ? `Hey ${username}.` : "Hey.";

  return (
    <View className="flex-1 items-center justify-center px-6">
      {gang.length > 0 ? (
        <View className="mb-6 flex-row -space-x-3">
          {gang.slice(0, 6).map((c) => {
            const url = `${SITE_URL}${resolveAvatarUrl(c.id, avatarStyle)}`;
            return (
              <View
                key={c.id}
                className="h-14 w-14 overflow-hidden rounded-full border-2 border-zinc-950 bg-zinc-800"
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
      ) : null}
      <Text className="text-center text-2xl font-bold text-white">
        {greeting}
      </Text>
      <Text className="mt-2 text-center text-zinc-400">
        Your gang's online. Send a message to get going.
      </Text>
    </View>
  );
}
