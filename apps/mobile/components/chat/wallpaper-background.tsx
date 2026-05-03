import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { type ChatWallpaper } from "@mygang/shared";

type Blob = {
  /** Two-color gradient (center -> edge). */
  colors: [string, string];
  /** Center position as 0-1 fractions of screen. */
  cx: number;
  cy: number;
  /** Radius as fraction of screen min-dimension. */
  rx: number;
  ry: number;
};

const WALLPAPERS: Record<ChatWallpaper, { base: string; blobs: Blob[] }> = {
  default: {
    base: "#161924",
    blobs: [],
  },
  neon: {
    base: "#0a1620",
    blobs: [
      { colors: ["rgba(62,221,192,0.55)", "rgba(62,221,192,0)"], cx: 0.15, cy: 0.25, rx: 0.95, ry: 0.95 },
      { colors: ["rgba(96,165,250,0.55)", "rgba(96,165,250,0)"], cx: 0.85, cy: 0.55, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(217,70,239,0.45)", "rgba(217,70,239,0)"], cx: 0.50, cy: 0.95, rx: 1.1, ry: 1.1 },
    ],
  },
  aurora: {
    base: "#0c1428",
    blobs: [
      { colors: ["rgba(34,211,238,0.55)", "rgba(34,211,238,0)"], cx: 0.20, cy: 0.20, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(74,222,128,0.45)", "rgba(74,222,128,0)"], cx: 0.80, cy: 0.30, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(167,139,250,0.45)", "rgba(167,139,250,0)"], cx: 0.50, cy: 0.85, rx: 1.1, ry: 1.1 },
    ],
  },
  sunset: {
    base: "#1a1020",
    blobs: [
      { colors: ["rgba(251,146,60,0.55)", "rgba(251,146,60,0)"], cx: 0.20, cy: 0.20, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(244,114,182,0.50)", "rgba(244,114,182,0)"], cx: 0.85, cy: 0.55, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(168,85,247,0.45)", "rgba(168,85,247,0)"], cx: 0.50, cy: 0.95, rx: 1.1, ry: 1.1 },
    ],
  },
  soft: {
    base: "#16181f",
    blobs: [
      { colors: ["rgba(148,163,184,0.30)", "rgba(148,163,184,0)"], cx: 0.30, cy: 0.30, rx: 1.2, ry: 1.2 },
      { colors: ["rgba(199,210,254,0.25)", "rgba(199,210,254,0)"], cx: 0.75, cy: 0.75, rx: 1.2, ry: 1.2 },
    ],
  },
  graphite: {
    base: "#0e0f12",
    blobs: [
      { colors: ["rgba(255,255,255,0.10)", "rgba(255,255,255,0)"], cx: 0.30, cy: 0.20, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0)"], cx: 0.80, cy: 0.85, rx: 1.0, ry: 1.0 },
    ],
  },
  midnight: {
    base: "#070b16",
    blobs: [
      { colors: ["rgba(59,130,246,0.45)", "rgba(59,130,246,0)"], cx: 0.20, cy: 0.30, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(99,102,241,0.40)", "rgba(99,102,241,0)"], cx: 0.85, cy: 0.75, rx: 1.0, ry: 1.0 },
    ],
  },
};

type WallpaperBackgroundProps = {
  wallpaper: ChatWallpaper;
  children: ReactNode;
};

export function WallpaperBackground({ wallpaper, children }: WallpaperBackgroundProps) {
  const preset = WALLPAPERS[wallpaper] ?? WALLPAPERS.default;

  return (
    <View className="flex-1" style={{ backgroundColor: preset.base }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {preset.blobs.map((blob, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: `${(blob.cx - blob.rx / 2) * 100}%`,
              top: `${(blob.cy - blob.ry / 2) * 100}%`,
              width: `${blob.rx * 100}%`,
              height: `${blob.ry * 100}%`,
              borderRadius: 9999,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={blob.colors}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 0, y: 0 }}
              style={{ flex: 1 }}
            />
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}
