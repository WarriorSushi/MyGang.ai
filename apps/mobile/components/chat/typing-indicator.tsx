import { useEffect, useRef } from "react";
import { Animated, Image, Text, View } from "react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type Character,
} from "@mygang/shared";

const SITE_URL = "https://mygang.ai";

type TypingIndicatorProps = {
  character: Character;
  customName?: string | null;
  avatarStyle: AvatarStyle;
};

function Dot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 350,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity]);
  return (
    <Animated.View
      style={{ opacity }}
      className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
    />
  );
}

export function TypingIndicator({
  character,
  customName,
  avatarStyle,
}: TypingIndicatorProps) {
  const avatarUrl = `${SITE_URL}${resolveAvatarUrl(character.id, avatarStyle)}`;
  const name = customName ?? character.name;

  return (
    <View className="my-1 flex-row items-end gap-2 px-3">
      <View className="h-8 w-8 overflow-hidden rounded-full border border-border bg-muted">
        <Image source={{ uri: avatarUrl }} className="h-full w-full" resizeMode="cover" />
      </View>
      <View>
        <Text className="mb-0.5 text-[11px] font-semibold text-muted-foreground/70">{name}</Text>
        <View className="flex-row items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
          <Dot delay={0} />
          <Dot delay={200} />
          <Dot delay={400} />
        </View>
      </View>
    </View>
  );
}
