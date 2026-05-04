import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";
import { useRouter } from "expo-router";
import { Brain, RefreshCw, Settings } from "lucide-react-native";

import { useAuth } from "../../lib/auth-context";

const SITE_URL = "https://mygang.ai";
const ICON_COLOR = "#a1a1aa";
const STATUS_DOT_GREEN = "#34d399";
const STATUS_DOT_AMBER = "#f59e0b";

type ChatHeaderProps = {
  characters: CharacterCatalogEntry[];
  avatarStyle: AvatarStyle;
  onAvatarPress?: (character: CharacterCatalogEntry) => void;
  onRefresh?: () => void | Promise<void>;
  onOpenSettings: () => void;
  onOpenMemoryVault?: () => void;
  newMemoryCount?: number;
  isTyping?: boolean;
};

export function ChatHeader({
  characters,
  avatarStyle,
  onAvatarPress,
  onRefresh,
  onOpenSettings,
  onOpenMemoryVault,
  newMemoryCount = 0,
  isTyping = false,
}: ChatHeaderProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshRotation = useSharedValue(0);
  const typingPulse = useSharedValue(1);

  const refreshAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshRotation.value}deg` }],
  }));

  const typingDotStyle = useAnimatedStyle(() => ({
    opacity: typingPulse.value,
  }));

  useEffect(() => {
    if (isTyping) {
      typingPulse.value = withRepeat(
        withTiming(0.3, { duration: 600 }),
        -1,
        true
      );
    } else {
      cancelAnimation(typingPulse);
      typingPulse.value = 1;
    }
    return () => {
      cancelAnimation(typingPulse);
    };
  }, [isTyping, typingPulse]);

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

  const tier = (profile?.subscription_tier ?? "free") as string;
  const isPaid = tier !== "free";
  const memoryLabel = isPaid ? "Memory active" : "Starter memory";
  const dotColor = isTyping ? STATUS_DOT_AMBER : STATUS_DOT_GREEN;

  return (
    <View className="flex-row items-center justify-between border-b border-border bg-background px-3 py-2">
      <View className="flex-1 flex-row items-center">
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

        <View className="ml-3 flex-1 flex-row items-center gap-1.5">
          <Animated.View
            style={[
              {
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: dotColor,
              },
              isTyping ? typingDotStyle : undefined,
            ]}
          />
          <Text
            className="text-[11px] text-muted-foreground/80"
            numberOfLines={1}
          >
            {characters.length} online · {memoryLabel}
          </Text>
        </View>
      </View>

      {onRefresh ? (
        <Pressable
          onPress={handleRefresh}
          disabled={isRefreshing}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-card"
          accessibilityLabel="Refresh chat"
        >
          <Animated.View style={refreshAnimStyle}>
            <RefreshCw size={18} color={ICON_COLOR} strokeWidth={2} />
          </Animated.View>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => {
          if (onOpenMemoryVault) {
            onOpenMemoryVault();
          } else {
            router.push("/(app)/memory-vault");
          }
        }}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-card"
        accessibilityLabel="Memory vault"
      >
        <Brain size={18} color={ICON_COLOR} strokeWidth={2} />
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
        className="h-9 w-9 items-center justify-center rounded-full active:bg-card"
        accessibilityLabel="Settings"
      >
        <Settings size={18} color={ICON_COLOR} strokeWidth={2} />
      </Pressable>
    </View>
  );
}
