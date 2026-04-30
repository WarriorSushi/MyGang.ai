import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";
import { useRouter } from "expo-router";

const SITE_URL = "https://mygang.ai";

type ChatHeaderProps = {
  characters: CharacterCatalogEntry[];
  avatarStyle: AvatarStyle;
  onAvatarPress?: (character: CharacterCatalogEntry) => void;
  onRefresh?: () => void | Promise<void>;
  onOpenSettings: () => void;
  newMemoryCount?: number;
};

export function ChatHeader({
  characters,
  avatarStyle,
  onAvatarPress,
  onRefresh,
  onOpenSettings,
  newMemoryCount = 0,
}: ChatHeaderProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshRotation = useSharedValue(0);

  const refreshAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshRotation.value}deg` }],
  }));

  async function handleRefresh() {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    refreshRotation.value = withTiming(refreshRotation.value + 360, {
      duration: 800,
    });
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <View className="flex-row items-center justify-between border-b border-border bg-background/85 px-3 py-2">
      <View className="flex-row -space-x-2">
        {characters.slice(0, 6).map((c) => {
          const url = `${SITE_URL}${resolveAvatarUrl(c.id, avatarStyle)}`;
          return (
            <Pressable
              key={c.id}
              onPress={() => onAvatarPress?.(c)}
              className="h-8 w-8 overflow-hidden rounded-full border-2 border-background"
              style={{ backgroundColor: c.color }}
            >
              <Image
                source={{ uri: url }}
                className="h-full w-full"
                resizeMode="cover"
              />
            </Pressable>
          );
        })}
      </View>

      <View className="flex-1 px-3">
        <Text className="text-sm font-bold text-foreground">Your gang</Text>
        <Text className="text-[10px] text-muted-foreground/70">
          {characters.length} online
        </Text>
      </View>

      {onRefresh ? (
        <Pressable
          onPress={handleRefresh}
          disabled={isRefreshing}
          className="mr-1.5 h-9 w-9 items-center justify-center rounded-full border border-border bg-card"
          accessibilityLabel="Refresh chat"
        >
          <Animated.Text
            style={refreshAnimStyle}
            className="text-base text-muted-foreground"
          >
            ↻
          </Animated.Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => router.push("/(app)/memory-vault")}
        className="mr-1.5 h-9 w-9 items-center justify-center rounded-full border border-border bg-card"
        accessibilityLabel="Memory vault"
      >
        <Text className="text-base text-muted-foreground">🧠</Text>
        {newMemoryCount > 0 ? (
          <View className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1">
            <Text className="text-[9px] font-bold text-primary-foreground">
              {newMemoryCount > 9 ? "9+" : newMemoryCount}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        onPress={onOpenSettings}
        className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card"
        accessibilityLabel="Settings"
      >
        <Text className="text-base text-muted-foreground">⚙</Text>
      </Pressable>
    </View>
  );
}
