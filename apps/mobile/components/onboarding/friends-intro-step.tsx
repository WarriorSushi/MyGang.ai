import { Image, ScrollView, Text, TextInput, View } from "react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";
import { PrimaryButton } from "../primary-button";

const SITE_URL = "https://mygang.ai";

type FriendsIntroStepProps = {
  characters: CharacterCatalogEntry[];
  selectedIds: string[];
  customNames: Record<string, string>;
  onNameChange: (characterId: string, nextName: string) => void;
  onNext: () => void;
  avatarStyle: AvatarStyle;
};

export function FriendsIntroStep({
  characters,
  selectedIds,
  customNames,
  onNameChange,
  onNext,
  avatarStyle,
}: FriendsIntroStepProps) {
  const selectedCharacters = characters.filter((c) =>
    selectedIds.includes(c.id)
  );

  return (
    <View className="flex-1">
      <View className="px-6 pt-4 pb-2">
        <Text className="text-center text-2xl font-black text-foreground">
          Meet your AI friends
        </Text>
        <Text className="mt-1 text-center text-xs text-muted-foreground">
          Customize or keep defaults. Change them later anytime in settings.
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
                </View>
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
                    className="mt-1 h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground"
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 border-t border-border bg-background/95 px-6 py-3 pb-6">
        <Text className="mb-2 text-center text-xs text-muted-foreground">
          {selectedCharacters.length} friend
          {selectedCharacters.length !== 1 ? "s" : ""} ready
        </Text>
        <PrimaryButton label="Start Chat →" onPress={onNext} />
      </View>
    </View>
  );
}
