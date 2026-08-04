import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { type ChatWallpaper } from "@mygang/shared";

/**
 * Each wallpaper is a base color + a single LinearGradient overlay sweep.
 *
 * Why not radial blobs? React Native's LinearGradient inside a circular
 * `borderRadius: 9999` clip doesn't reliably mask on Android — the gradient
 * shows through as a rectangle. We had this bug ship and it looked like
 * "solid color stripes" instead of soft blobs. A diagonal LinearGradient
 * always renders correctly and reads as a gradient on every device.
 *
 * Each preset's overlay colors are kept LOW-ALPHA so the chat content stays
 * legible. The base color carries the dark mood; the overlay tints it.
 */

type Preset = {
  /** Base color filling the whole surface. */
  base: string;
  /** 3-5 color stops for the diagonal sweep overlay. Use rgba for low alpha. */
  overlay: string[];
};

const WALLPAPERS: Record<ChatWallpaper, Preset> = {
  default: {
    base: "#161924",
    overlay: ["rgba(0,0,0,0)", "rgba(0,0,0,0)"],
  },
  neon: {
    base: "#0a1620",
    overlay: [
      "rgba(62,221,192,0.32)",
      "rgba(62,221,192,0)",
      "rgba(96,165,250,0.32)",
      "rgba(217,70,239,0)",
      "rgba(217,70,239,0.28)",
    ],
  },
  aurora: {
    base: "#0c1428",
    overlay: [
      "rgba(34,211,238,0.30)",
      "rgba(34,211,238,0)",
      "rgba(74,222,128,0.28)",
      "rgba(167,139,250,0)",
      "rgba(167,139,250,0.30)",
    ],
  },
  sunset: {
    base: "#1a1020",
    overlay: [
      "rgba(251,146,60,0.32)",
      "rgba(244,114,182,0)",
      "rgba(244,114,182,0.28)",
      "rgba(168,85,247,0)",
      "rgba(168,85,247,0.32)",
    ],
  },
  soft: {
    base: "#16181f",
    overlay: [
      "rgba(148,163,184,0.16)",
      "rgba(148,163,184,0)",
      "rgba(199,210,254,0.14)",
    ],
  },
  graphite: {
    base: "#0e0f12",
    overlay: [
      "rgba(120,120,130,0.10)",
      "rgba(120,120,130,0)",
      "rgba(80,80,90,0.10)",
    ],
  },
  midnight: {
    base: "#070b16",
    overlay: [
      "rgba(59,130,246,0.30)",
      "rgba(59,130,246,0)",
      "rgba(99,102,241,0.28)",
    ],
  },
};

const LIGHT_WALLPAPERS: Record<ChatWallpaper, Preset> = {
  default: {
    base: "#eff3f8",
    overlay: ["rgba(0,0,0,0)", "rgba(0,0,0,0)"],
  },
  neon: {
    base: "#edf9f7",
    overlay: [
      "rgba(45,188,165,0.18)",
      "rgba(45,188,165,0)",
      "rgba(96,165,250,0.16)",
      "rgba(190,70,152,0)",
      "rgba(190,70,152,0.12)",
    ],
  },
  aurora: {
    base: "#eef8fb",
    overlay: [
      "rgba(34,145,184,0.16)",
      "rgba(34,145,184,0)",
      "rgba(45,188,120,0.14)",
      "rgba(124,92,190,0)",
      "rgba(124,92,190,0.14)",
    ],
  },
  sunset: {
    base: "#fff2ed",
    overlay: [
      "rgba(234,88,12,0.15)",
      "rgba(190,70,152,0)",
      "rgba(190,70,152,0.12)",
      "rgba(126,34,206,0)",
      "rgba(126,34,206,0.12)",
    ],
  },
  soft: {
    base: "#f3f6fb",
    overlay: [
      "rgba(100,116,139,0.10)",
      "rgba(100,116,139,0)",
      "rgba(129,140,248,0.10)",
    ],
  },
  graphite: {
    base: "#eef1f5",
    overlay: [
      "rgba(71,85,105,0.10)",
      "rgba(71,85,105,0)",
      "rgba(15,23,42,0.08)",
    ],
  },
  midnight: {
    base: "#eef4ff",
    overlay: [
      "rgba(59,130,246,0.14)",
      "rgba(59,130,246,0)",
      "rgba(99,102,241,0.12)",
    ],
  },
};

type WallpaperBackgroundProps = {
  wallpaper: ChatWallpaper;
  children: ReactNode;
};

export function WallpaperBackground({ wallpaper, children }: WallpaperBackgroundProps) {
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === "light" ? LIGHT_WALLPAPERS : WALLPAPERS;
  const preset = palette[wallpaper] ?? palette.default;

  return (
    <View className="flex-1" style={{ backgroundColor: preset.base }}>
      <LinearGradient
        colors={preset.overlay as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}
