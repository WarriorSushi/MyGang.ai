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
        selected ? "border-primary bg-card" : "border-border bg-background"
      }`}
      accessibilityRole="button"
      accessibilityLabel={`${character.name}. ${character.vibe}`}
      accessibilityHint={selected ? "Double tap to remove from your gang" : "Double tap to add to your gang"}
      accessibilityState={{ selected }}
    >
      <Image
        source={{ uri: avatarUrl }}
        className="h-14 w-14 rounded-full bg-muted"
      />
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-foreground">
          {character.name}
        </Text>
        <Text className="text-sm text-muted-foreground">{character.vibe}</Text>
      </View>
      {selected ? (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
          <Text className="text-xs font-bold text-primary-foreground">✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
