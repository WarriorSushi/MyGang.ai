import { memo, useEffect, useState } from "react";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";
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
import { Brain, RefreshCw, Settings, Share2 } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useReducedMotion } from "../../lib/use-reduced-motion";

const SITE_URL = "https://mygang.ai";
const ICON_COLOR = "#a1a1aa";
const STATUS_DOT_GREEN = "#34d399";
const STATUS_DOT_AMBER = "#f59e0b";

type ChatHeaderProps = {
  characters: CharacterCatalogEntry[];
  avatarStyle: AvatarStyle;
  onAvatarPress?: (character: CharacterCatalogEntry) => void;
  onRefresh?: () => void | Promise<void>;
  onShareTranscript?: () => void | Promise<void>;
  onOpenSettings: () => void;
  onOpenMemoryVault?: () => void;
  newMemoryCount?: number;
  isTyping?: boolean;
};

function ChatHeaderBase({
  characters,
  avatarStyle,
  onAvatarPress,
  onRefresh,
  onShareTranscript,
  onOpenSettings,
  onOpenMemoryVault,
  newMemoryCount = 0,
  isTyping = false,
}: ChatHeaderProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const visibleAvatarCount = width < 360 ? 2 : width < 400 ? 3 : width < 480 ? 4 : 6;
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
    if (reducedMotion) {
      cancelAnimation(typingPulse);
      typingPulse.value = 1;
      return;
    }
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
  }, [isTyping, reducedMotion, typingPulse]);

  async function handleRefresh() {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    if (!reducedMotion) {
      refreshRotation.value = withTiming(refreshRotation.value + 360, {
        duration: 800,
      });
    }
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  const dotColor = isTyping ? STATUS_DOT_AMBER : STATUS_DOT_GREEN;
  const dotBorderColor = colorScheme === "light" ? "#eff3f8" : "#161924";

  return (
    <View className="min-h-[56px] flex-row items-center justify-between border-b border-border bg-background px-3 py-2">
      <View className="flex-1 flex-row items-center pr-2">
        <View className="h-10 flex-row items-center">
          {characters.slice(0, visibleAvatarCount).map((c, index) => {
            const url = `${SITE_URL}${resolveAvatarUrl(c.id, avatarStyle)}`;
            return (
              <Pressable
                key={c.id}
                onPress={() => onAvatarPress?.(c)}
                className="h-10 w-10 overflow-hidden rounded-full border-2 border-background"
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`${c.name} profile`}
                style={{
                  backgroundColor: c.color,
                  marginLeft: index === 0 ? 0 : -12,
                  zIndex: visibleAvatarCount - index,
                  shadowColor: c.color,
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
              >
                <Image
                  source={{ uri: url }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                {index === 0 ? (
                  <Animated.View
                    style={[
                      {
                        position: "absolute",
                        right: 0,
                        bottom: 0,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        borderWidth: 2,
                        borderColor: dotBorderColor,
                        backgroundColor: dotColor,
                      },
                      isTyping ? typingDotStyle : undefined,
                    ]}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {onShareTranscript ? (
        <Pressable
          onPress={onShareTranscript}
          hitSlop={6}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-card"
          accessibilityRole="button"
          accessibilityLabel="Share chat"
        >
          <Share2 size={18} color={ICON_COLOR} strokeWidth={2} />
        </Pressable>
      ) : null}

      {onRefresh ? (
        <Pressable
          onPress={handleRefresh}
          disabled={isRefreshing}
          hitSlop={6}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-card"
          accessibilityRole="button"
          accessibilityLabel="Refresh chat"
          accessibilityState={{ disabled: isRefreshing, busy: isRefreshing }}
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
        hitSlop={6}
        className="h-11 w-11 items-center justify-center rounded-full active:bg-card"
        accessibilityRole="button"
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
        hitSlop={8}
        className="h-11 w-11 items-center justify-center rounded-full active:bg-card"
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Settings size={18} color={ICON_COLOR} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export const ChatHeader = memo(ChatHeaderBase);
