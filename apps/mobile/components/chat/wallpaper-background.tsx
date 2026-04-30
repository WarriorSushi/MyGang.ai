import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { View } from "react-native";
import { type ChatWallpaper } from "@mygang/shared";

// Wallpapers tinted around the brand palette: dark slate-blue base with
// hints of teal (--primary) and magenta (--accent) per pack.
const WALLPAPER_COLORS: Record<ChatWallpaper, [string, string, string]> = {
  default: ["#161924", "#1a1f2c", "#1a1d2a"],
  neon: ["#0c1a23", "#1c1330", "#0c1c1d"],
  soft: ["#1c1924", "#231f2a", "#181a25"],
  aurora: ["#101e2a", "#0c2027", "#0e2b2a"],
  sunset: ["#1f1a18", "#2c1f17", "#221c14"],
  graphite: ["#161924", "#1c1f29", "#15171f"],
  midnight: ["#0a0c14", "#0d0f17", "#070811"],
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
