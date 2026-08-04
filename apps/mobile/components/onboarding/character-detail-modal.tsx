import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";

import { SITE_URL } from "../../lib/config";

type CharacterDetailModalProps = {
  character: CharacterCatalogEntry | null;
  customName?: string;
  avatarStyle: AvatarStyle;
  onClose: () => void;
};

export function CharacterDetailModal({
  character,
  customName,
  avatarStyle,
  onClose,
}: CharacterDetailModalProps) {
  const visible = character !== null;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== "light";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1">
        <Pressable
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close character details"
        >
          <BlurView
            intensity={20}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View className={isDark ? "absolute inset-0 bg-black/60" : "absolute inset-0 bg-black/20"} />
        </Pressable>
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card"
            style={{
              shadowColor: "#000",
              shadowOpacity: isDark ? 0.5 : 0.18,
              shadowRadius: 32,
              shadowOffset: { width: 0, height: 16 },
              elevation: 16,
            }}
          >
            {character ? (
              <ScrollView contentContainerClassName="pb-6">
                {/* Hero */}
                <View className="relative aspect-square w-full bg-muted">
                  <Image
                    source={{ uri: `${SITE_URL}${resolveAvatarUrl(character.id, avatarStyle)}` }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={onClose}
                    className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                    accessibilityRole="button"
                    accessibilityLabel="Close character details"
                  >
                    <X size={16} color="#fff" strokeWidth={2.5} />
                  </Pressable>
                </View>

                {/* Body */}
                <View className="px-5 pt-5">
                  <Text
                    className="text-2xl font-black text-foreground"
                    style={{ color: character.color ?? "#3eddc0" }}
                  >
                    {customName ?? character.name}
                  </Text>
                  {character.roleLabel || character.archetype ? (
                    <Text className="mt-0.5 text-sm italic text-muted-foreground/80">
                      {character.roleLabel ?? character.archetype}
                    </Text>
                  ) : null}

                  {character.voice ? (
                    <DetailBlock label="Voice" body={character.voice} />
                  ) : null}

                  {character.vibe ? (
                    <DetailBlock label="Vibe" body={character.vibe} />
                  ) : null}

                  {character.sample ? (
                    <DetailBlock label="Sample line" body={`"${character.sample}"`} italic />
                  ) : null}

                  {character.tags && character.tags.length > 0 ? (
                    <View className="mt-4">
                      <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Tags
                      </Text>
                      <View className="flex-row flex-wrap gap-1.5">
                        {character.tags.map((tag) => (
                          <View
                            key={tag}
                            className="rounded-full border border-border bg-card px-2.5 py-1"
                          >
                            <Text className="text-[11px] text-muted-foreground">{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailBlock({
  label,
  body,
  italic,
}: {
  label: string;
  body: string;
  italic?: boolean;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </Text>
      <Text className={`text-sm text-foreground/90 ${italic ? "italic" : ""}`}>{body}</Text>
    </View>
  );
}
