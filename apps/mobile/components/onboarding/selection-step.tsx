import { FlatList, Image, Pressable, Text, View } from "react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";
import { PrimaryButton } from "../primary-button";

const SITE_URL = "https://mygang.ai";

type SelectionStepProps = {
  characters: CharacterCatalogEntry[];
  selectedIds: string[];
  toggleCharacter: (id: string) => void;
  onNext: () => void;
  maxMembers?: number;
  recommendedIds?: string[];
  avatarStyle: AvatarStyle;
};

export function SelectionStep({
  characters,
  selectedIds,
  toggleCharacter,
  onNext,
  maxMembers = 4,
  recommendedIds = [],
  avatarStyle,
}: SelectionStepProps) {
  const canContinue = selectedIds.length >= 2;
  const sortedCharacters =
    recommendedIds.length > 0
      ? [
          ...characters.filter((c) => recommendedIds.includes(c.id)),
          ...characters.filter((c) => !recommendedIds.includes(c.id)),
        ]
      : characters;

  return (
    <View className="flex-1">
      <View className="px-6 pt-4 pb-2">
        <Text className="text-center text-3xl font-black text-white">
          Pick your gang
        </Text>
        <Text className="mt-1 text-center text-sm text-zinc-400">
          Choose 2–{maxMembers} friends.
        </Text>
      </View>

      <FlatList
        data={sortedCharacters}
        keyExtractor={(c) => c.id}
        numColumns={3}
        contentContainerClassName="px-3 pb-32"
        columnWrapperClassName="gap-2"
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          const isRecommended = recommendedIds.includes(item.id);
          const url = `${SITE_URL}${resolveAvatarUrl(item.id, avatarStyle)}`;
          return (
            <Pressable
              onPress={() => toggleCharacter(item.id)}
              className={`flex-1 overflow-hidden rounded-xl border bg-zinc-900 ${
                isSelected ? "border-2 border-white" : "border-zinc-800"
              }`}
            >
              {isSelected ? (
                <View className="absolute right-1.5 top-1.5 z-10 h-5 w-5 items-center justify-center rounded-full bg-white">
                  <Text className="text-[10px] font-bold text-zinc-950">✓</Text>
                </View>
              ) : null}
              {isRecommended && !isSelected ? (
                <View className="absolute left-1.5 right-1.5 top-1.5 z-10 rounded-full bg-amber-400 px-1 py-0.5">
                  <Text className="text-center text-[8px] font-bold uppercase tracking-wider text-zinc-950">
                    Recommended
                  </Text>
                </View>
              ) : null}
              <View className="aspect-[4/5] bg-zinc-800">
                <Image
                  source={{ uri: url }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              </View>
              <View className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                <Text className="text-xs font-bold text-white" numberOfLines={1}>
                  {item.name}
                </Text>
                {item.archetype ? (
                  <Text
                    className="text-[8px] font-semibold uppercase tracking-wider text-white/70"
                    numberOfLines={1}
                  >
                    {item.archetype}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />

      <View className="absolute inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/95 px-6 py-3 pb-6">
        <View className="mb-2 flex-row items-center">
          <Text className="text-xs text-zinc-400">
            {selectedIds.length === 0
              ? `Pick 2–${maxMembers}`
              : selectedIds.length < 2
                ? `${2 - selectedIds.length} more needed`
                : `${selectedIds.length} selected`}
          </Text>
        </View>
        <PrimaryButton
          label="Let's Go →"
          onPress={onNext}
          disabled={!canContinue}
        />
      </View>
    </View>
  );
}
