import { View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";

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
      className="border border-white/10"
    >
      <BlurView
        intensity={40}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={{ flex: 1 }}
      >
        <View
          style={{ backgroundColor: "rgba(7,12,20,0.74)" }}
          className="p-6"
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
}
