import { View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { useColorScheme } from "nativewind";

type GlassCardProps = ViewProps & {
  withShadow?: boolean;
};

/**
 * Translucent dark card with a frosted backdrop and rounded-[28px] (~2rem) corners.
 * Mirrors the web `glass-card` container used across auth + content blocks.
 */
export function GlassCard({
  children,
  withShadow = true,
  style,
  ...rest
}: GlassCardProps) {
  const { colorScheme } = useColorScheme();
  const isLight = colorScheme === "light";
  return (
    <View
      {...rest}
      style={[
        {
          borderRadius: 28,
          overflow: "hidden",
          ...(withShadow
            ? {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 24 },
                shadowOpacity: 0.45,
                shadowRadius: 48,
                elevation: 12,
              }
            : null),
        },
        style,
      ]}
      className="border border-border"
    >
      <BlurView
        intensity={isLight ? 28 : 40}
        tint={isLight ? "light" : "dark"}
        experimentalBlurMethod="dimezisBlurView"
        style={{ flex: 1 }}
      >
        <View
          style={{
            backgroundColor: isLight
              ? "rgba(255,255,255,0.82)"
              : "rgba(7,12,20,0.74)",
          }}
          className="p-6"
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
}
