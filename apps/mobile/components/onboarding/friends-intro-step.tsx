import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ArrowRight, ChevronRight, Lock } from "lucide-react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";
import { PrimaryButton } from "../primary-button";
import { CharacterDetailModal } from "./character-detail-modal";

const SITE_URL = "https://mygang.ai";

type FriendsIntroStepProps = {
  characters: CharacterCatalogEntry[];
  selectedIds: string[];
  customNames: Record<string, string>;
  onNameChange: (characterId: string, nextName: string) => void;
  onNext: () => void;
  avatarStyle: AvatarStyle;
  canCustomizeNames?: boolean;
};

export function FriendsIntroStep({
  characters,
  selectedIds,
  customNames,
  onNameChange,
  onNext,
  avatarStyle,
  canCustomizeNames = true,
}: FriendsIntroStepProps) {
  const selectedCharacters = characters.filter((c) =>
    selectedIds.includes(c.id)
  );

  const [detailCharacterId, setDetailCharacterId] = useState<string | null>(
    null
  );
  const detailCharacter = detailCharacterId
    ? selectedCharacters.find((c) => c.id === detailCharacterId) ?? null
    : null;

  return (
    <View className="flex-1">
      <View className="px-6 pt-4 pb-2">
        <Text className="text-center text-2xl font-black text-foreground">
          Meet your AI friends
        </Text>
        <Text className="mt-1 text-center text-xs text-muted-foreground">
          {canCustomizeNames
            ? "Customize or keep defaults. Change them later anytime in settings."
            : "Custom names unlock with Basic or Pro. Defaults are ready for now."}
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-32">
        <View className="gap-3">
          {selectedCharacters.map((c) => {
            const url = `${SITE_URL}${resolveAvatarUrl(c.id, avatarStyle)}`;
            return (
              <View
                key={c.id}
                className="rounded-xl border border-border bg-card-translucent p-3"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 overflow-hidden rounded-xl border border-border bg-muted">
                    <Image
                      source={{ uri: url }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">
                      {c.name}
                    </Text>
                    {c.archetype ? (
                      <Text className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {c.archetype}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => setDetailCharacterId(c.id)}
                    className="min-h-8 flex-row items-center gap-1 self-start rounded-full border border-border bg-card-translucent px-2.5 py-1"
                    accessibilityRole="button"
                    accessibilityLabel={`View ${c.name} details`}
                  >
                    <Text className="text-[10px] font-semibold text-muted-foreground">
                      Details
                    </Text>
                    <ChevronRight size={11} color="#a1a1aa" strokeWidth={2.5} />
                  </Pressable>
                </View>
                {canCustomizeNames ? (
                  <View className="mt-3">
                    <Text className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                      Change name or ignore to keep default
                    </Text>
                    <TextInput
                      value={customNames[c.id] ?? ""}
                      onChangeText={(text) =>
                        onNameChange(c.id, text.slice(0, 30))
                      }
                      placeholder={c.name}
                      placeholderTextColor="#71717a"
                      maxLength={30}
                      className="mt-1 min-h-11 rounded-lg border border-border bg-muted px-3 text-sm text-foreground"
                    />
                  </View>
                ) : (
                  <View className="mt-3 min-h-11 flex-row items-center gap-2 rounded-lg border border-border bg-muted px-3">
                    <Lock size={13} color="#71717a" strokeWidth={2.5} />
                    <Text className="flex-1 text-xs text-muted-foreground">
                      Uses default name on Free
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 flex-row items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 pb-6">
        <Text className="text-xs text-muted-foreground">
          {selectedCharacters.length} friend
          {selectedCharacters.length !== 1 ? "s" : ""} ready
        </Text>
        <View className="w-36">
          <PrimaryButton
            label="Start Chat"
            onPress={onNext}
            size="default"
            iconRight={ArrowRight}
          />
        </View>
      </View>

      <CharacterDetailModal
        character={detailCharacter}
        customName={
          detailCharacter ? customNames[detailCharacter.id] : undefined
        }
        avatarStyle={avatarStyle}
        onClose={() => setDetailCharacterId(null)}
      />
    </View>
  );
}
