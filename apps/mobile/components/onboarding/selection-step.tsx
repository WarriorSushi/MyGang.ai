import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { ArrowRight, ChevronRight } from "lucide-react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";
import { PrimaryButton } from "../primary-button";
import { CharacterDetailModal } from "./character-detail-modal";

const SITE_URL = "https://mygang.ai";

type SelectionStepProps = {
  characters: CharacterCatalogEntry[];
  selectedIds: string[];
  toggleCharacter: (id: string) => void;
  onNext: () => void;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  maxMembers?: number;
  recommendedIds?: string[];
  avatarStyle: AvatarStyle;
  onLimitReached?: () => void;
};

export function SelectionStep({
  characters,
  selectedIds,
  toggleCharacter,
  onNext,
  title = "Pick your gang",
  subtitle,
  ctaLabel = "Let's Go",
  maxMembers = 4,
  recommendedIds = [],
  avatarStyle,
  onLimitReached,
}: SelectionStepProps) {
  const overLimit = selectedIds.length > maxMembers;
  const canContinue = selectedIds.length >= 2 && !overLimit;
  const [detailCharacterId, setDetailCharacterId] = useState<string | null>(null);

  const sortedCharacters =
    recommendedIds.length > 0
      ? [
          ...characters.filter((c) => recommendedIds.includes(c.id)),
          ...characters.filter((c) => !recommendedIds.includes(c.id)),
        ]
      : characters;

  // Pad the array to a multiple of 3 so FlatList's numColumns doesn't stretch
  // the last partial row. Without this, with 14 characters in 3 columns, the
  // bottom 2 cards each get ~50% width instead of ~33% — the bug user reported.
  const COLS = 3;
  const padded: (CharacterCatalogEntry | { __empty: true; id: string })[] = [
    ...sortedCharacters,
  ];
  const remainder = padded.length % COLS;
  if (remainder > 0) {
    for (let i = 0; i < COLS - remainder; i++) {
      padded.push({ __empty: true, id: `__empty-${i}` });
    }
  }

  const detailCharacter =
    detailCharacterId !== null
      ? (characters.find((c) => c.id === detailCharacterId) ?? null)
      : null;

  return (
    <View className="flex-1">
      <View className="px-6 pt-4 pb-2">
        <Text className="text-center text-3xl font-black text-foreground">
          {title}
        </Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">
          {overLimit
            ? `Remove ${selectedIds.length - maxMembers} to fit this plan.`
            : (subtitle ?? `Choose 2-${maxMembers} friends.`)}
        </Text>
      </View>

      <FlatList
        data={padded}
        keyExtractor={(c) => c.id}
        numColumns={3}
        contentContainerClassName="px-3 pb-32"
        columnWrapperClassName="gap-2"
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => {
          // Empty padding cell — invisible spacer that keeps the last row's
          // real cards at 1/3 width.
          if ("__empty" in item) {
            return <View className="flex-1" />;
          }
          const isSelected = selectedIds.includes(item.id);
          const isRecommended = recommendedIds.includes(item.id);
          const url = `${SITE_URL}${resolveAvatarUrl(item.id, avatarStyle)}`;
          return (
            <View
              className={`flex-1 rounded-[14px] ${isSelected ? "bg-primary/30" : ""}`}
              style={{
                padding: isSelected ? 3 : 0,
                ...(isSelected && {
                  shadowColor: "#3eddc0",
                  shadowOpacity: 0.28,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 0,
                }),
              }}
            >
              <Pressable
            onPress={() => {
              if (!isSelected && selectedIds.length >= maxMembers) {
                onLimitReached?.();
                return;
              }
              toggleCharacter(item.id);
            }}
            className={`overflow-hidden rounded-xl border bg-card ${
              isSelected ? "border-[3px] border-primary" : "border-border"
            }`}
            accessibilityRole="button"
            accessibilityLabel={`${isSelected ? "Remove" : "Add"} ${item.name}`}
            accessibilityState={{ selected: isSelected }}
          >
                {isSelected ? (
                  <View className="absolute right-1.5 top-1.5 z-10 h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Text className="text-[10px] font-bold text-primary-foreground">✓</Text>
                  </View>
                ) : null}
                {isRecommended && !isSelected ? (
                  <View className="absolute left-1.5 right-1.5 top-1.5 z-10 rounded-full bg-primary/90 px-1 py-0.5">
                    <Text className="text-center text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
                      Recommended
                    </Text>
                  </View>
                ) : null}
                <View className="aspect-[4/5] bg-muted">
                  <Image
                    source={{ uri: url }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </View>
                <View className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 pt-1.5 pb-1.5">
                  <Text
                    className="text-xs font-bold text-foreground"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.archetype ? (
                    <Text
                      className="text-[8px] font-semibold uppercase tracking-wider text-foreground/70"
                      numberOfLines={1}
                    >
                      {item.archetype}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setDetailCharacterId(item.id);
                    }}
                    hitSlop={6}
                    className="mt-1 min-h-8 flex-row items-center justify-center gap-0.5 rounded-full border border-border bg-card-translucent px-2"
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.name} details`}
                  >
                    <Text className="text-[9px] font-semibold text-muted-foreground">
                      Details
                    </Text>
                    <ChevronRight size={10} color="#a1a1aa" strokeWidth={2.5} />
                  </Pressable>
                </View>
              </Pressable>
            </View>
          );
        }}
      />

      <View className="absolute inset-x-0 bottom-0 flex-row items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 pb-6">
        <View className="flex-1 flex-row items-center">
          {selectedIds.slice(0, 6).map((id, i) => {
            const c = characters.find((x) => x.id === id);
            if (!c) return null;
            return (
              <View
                key={id}
                className="overflow-hidden rounded-full border-2 border-background bg-muted"
                style={{
                  width: 28,
                  height: 28,
                  marginLeft: i === 0 ? 0 : -10,
                }}
              >
                <Image
                  source={{ uri: `${SITE_URL}${resolveAvatarUrl(c.id, avatarStyle)}` }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>
            );
          })}
          <Text className="ml-3 text-xs text-muted-foreground">
            {selectedIds.length === 0
              ? `Pick 2-${maxMembers}`
              : overLimit
                ? `${selectedIds.length}/${maxMembers} over limit`
                : `${selectedIds.length}/${maxMembers}`}
          </Text>
        </View>
        <View className="w-32">
          <PrimaryButton
            label={ctaLabel}
            onPress={onNext}
            disabled={!canContinue}
            size="default"
            iconRight={ArrowRight}
          />
        </View>
      </View>

      <CharacterDetailModal
        character={detailCharacter}
        avatarStyle={avatarStyle}
        onClose={() => setDetailCharacterId(null)}
      />
    </View>
  );
}
