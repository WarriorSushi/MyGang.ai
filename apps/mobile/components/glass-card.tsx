import { BlurView } from "expo-blur";
import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type GlassCardProps = {
  children: ReactNode;
  intensity?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Translucent card with a real backdrop blur. Mirrors web's glass-card
 * pattern (bg-card/82 + backdrop-blur-xl). On Android the blur is a
 * single-pass approximation; on iOS it's hardware-accelerated.
 */
export function GlassCard({
  children,
  intensity = 28,
  className,
  style,
}: GlassCardProps) {
  return (
    <View
      style={style}
      className={`overflow-hidden border border-border ${className ?? ""}`}
    >
      <BlurView
        intensity={intensity}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle tint on top of the blur to keep contrast strong */}
      <View
        className="bg-card-translucent"
        style={StyleSheet.absoluteFill}
      />
      <View>{children}</View>
    </View>
  );
}
