import { Image, Pressable, Text, View } from "react-native";
import type { Character } from "@mygang/shared";
import { resolveAvatarUrl } from "@mygang/shared";

type CharacterCardProps = {
  character: Character;
  selected: boolean;
  onPress: () => void;
  siteUrl: string;
};

export function CharacterCard({
  character,
  selected,
  onPress,
  siteUrl,
}: CharacterCardProps) {
  const avatarPath = resolveAvatarUrl(character.id);
  const avatarUrl = `${siteUrl}${avatarPath}`;

  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 flex-row items-center rounded-xl border-2 p-3 ${
        selected ? "border-white bg-zinc-900" : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <Image
        source={{ uri: avatarUrl }}
        className="h-14 w-14 rounded-full bg-zinc-800"
      />
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-white">
          {character.name}
        </Text>
        <Text className="text-sm text-zinc-400">{character.vibe}</Text>
      </View>
      {selected ? (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-white">
          <Text className="text-xs font-bold text-zinc-950">✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
