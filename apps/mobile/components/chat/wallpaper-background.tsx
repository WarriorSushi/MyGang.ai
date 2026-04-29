import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { View } from "react-native";
import { type ChatWallpaper } from "@mygang/shared";

const WALLPAPER_COLORS: Record<ChatWallpaper, [string, string, string]> = {
  default: ["#0a0a0f", "#1a0f1a", "#0a0f1a"],
  neon: ["#0a0a1a", "#1f0a2a", "#0a1f2a"],
  soft: ["#1a1620", "#1f1a25", "#15151a"],
  aurora: ["#0a1620", "#0f1f2a", "#0a2a25"],
  sunset: ["#1a0a0a", "#2a1a0a", "#1f1a0a"],
  graphite: ["#0a0a0a", "#1a1a1a", "#141414"],
  midnight: ["#000000", "#0a0a0a", "#000000"],
};

type WallpaperBackgroundProps = {
  wallpaper: ChatWallpaper;
  children: ReactNode;
};

export function WallpaperBackground({
  wallpaper,
  children,
}: WallpaperBackgroundProps) {
  const colors = WALLPAPER_COLORS[wallpaper] ?? WALLPAPER_COLORS.default;
  return (
    <View className="flex-1">
      <LinearGradient
        colors={colors}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      {children}
    </View>
  );
}
