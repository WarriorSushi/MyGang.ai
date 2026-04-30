import { Image, Modal, Pressable, Text, View } from "react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type Character,
} from "@mygang/shared";

const SITE_URL = "https://mygang.ai";

type AvatarLightboxProps = {
  character: Character | null;
  customName?: string | null;
  avatarStyle: AvatarStyle;
  onClose: () => void;
};

export function AvatarLightbox({
  character,
  customName,
  avatarStyle,
  onClose,
}: AvatarLightboxProps) {
  const visible = character !== null;
  if (!character) {
    return (
      <Modal visible={false} transparent>
        <View />
      </Modal>
    );
  }

  const url = `${SITE_URL}${resolveAvatarUrl(character.id, avatarStyle)}`;
  const name = customName ?? character.name;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/85 px-6"
      >
        <View className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card">
          <View className="aspect-square w-full bg-muted">
            <Image
              source={{ uri: url }}
              className="h-full w-full"
              resizeMode="cover"
            />
          </View>
          <View className="p-4">
            <Text className="text-2xl font-black text-foreground">{name}</Text>
            {character.archetype ? (
              <Text className="mt-0.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
                {character.archetype}
              </Text>
            ) : null}
            {character.vibe ? (
              <View className="mt-3">
                <Text className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  Vibe
                </Text>
                <Text className="mt-0.5 text-sm text-foreground">
                  {character.vibe}
                </Text>
              </View>
            ) : null}
            {character.voice ? (
              <View className="mt-3">
                <Text className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  Voice
                </Text>
                <Text className="mt-0.5 text-sm text-foreground">
                  {character.voice}
                </Text>
              </View>
            ) : null}
            {character.sample ? (
              <View className="mt-3">
                <Text className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  Sample
                </Text>
                <Text className="mt-0.5 text-sm italic text-foreground/85">
                  "{character.sample}"
                </Text>
              </View>
            ) : null}
            {character.tags && character.tags.length > 0 ? (
              <View className="mt-3 flex-row flex-wrap gap-1.5">
                {character.tags.map((tag) => (
                  <View
                    key={tag}
                    className="rounded-full border border-border bg-muted px-2.5 py-0.5"
                  >
                    <Text className="text-[10px] font-medium text-foreground/85">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            className="border-t border-border px-4 py-3 active:bg-muted"
          >
            <Text className="text-center text-sm font-semibold text-foreground/85">
              Close
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
