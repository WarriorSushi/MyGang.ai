import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ArrowRight, type LucideIcon } from "lucide-react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = "solid" | "gradient";
type Size = "default" | "lg" | "xl";

type PrimaryButtonProps = {
  label: string;
  onPress?: PressableProps["onPress"];
  isLoading?: boolean;
  disabled?: boolean;
  size?: Size;
  variant?: Variant;
  /** Lucide icon component to render at trailing edge (e.g. ArrowRight). */
  iconRight?: LucideIcon;
  /** When true, label is rendered uppercase with wide letter-spacing (auth-style). */
  upperCase?: boolean;
};

const SIZE_HEIGHT: Record<Size, number> = { default: 44, lg: 52, xl: 60 };
const SIZE_TEXT: Record<Size, string> = {
  default: "text-base",
  lg: "text-base",
  xl: "text-lg",
};

export function PrimaryButton({
  label,
  onPress,
  isLoading = false,
  disabled = false,
  size = "default",
  variant = "solid",
  iconRight,
  upperCase = false,
}: PrimaryButtonProps) {
  const scale = useSharedValue(1);
  const isInteractive = !isLoading && !disabled;

  useEffect(() => {
    scale.value = 1;
  }, [disabled, isLoading, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Icon = iconRight ?? ArrowRight;
  const showIcon = iconRight !== undefined;

  const labelClasses = `${SIZE_TEXT[size]} font-bold ${
    upperCase ? "uppercase tracking-[0.18em] font-black" : ""
  } ${variant === "solid" ? "text-primary-foreground" : "text-black"}`;

  const inner = (
    <View className="flex-row items-center justify-center gap-2">
      {isLoading ? (
        <ActivityIndicator
          color={variant === "solid" ? "#1a1d24" : "#0a0a0a"}
        />
      ) : (
        <>
          <Text className={labelClasses}>{label}</Text>
          {showIcon ? (
            <Icon
              size={size === "xl" ? 22 : size === "lg" ? 20 : 18}
              color={variant === "solid" ? "#1a1d24" : "#0a0a0a"}
              strokeWidth={2.5}
            />
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!isInteractive}
      onPressIn={() => {
        if (isInteractive)
          scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 320 });
      }}
      style={[
        animatedStyle,
        {
          height: SIZE_HEIGHT[size],
          opacity: isInteractive ? 1 : 0.55,
          shadowColor: variant === "solid" ? "#3eddc0" : "#22d3ee",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isInteractive ? 0.25 : 0,
          shadowRadius: 16,
          elevation: isInteractive ? 6 : 0,
        },
      ]}
      className="overflow-hidden rounded-full"
    >
      {variant === "gradient" ? (
        <LinearGradient
          colors={["#7dd3fc", "#67e8f9", "#6ee7b7"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View className="flex-1 items-center justify-center bg-primary">
          {inner}
        </View>
      )}
    </AnimatedPressable>
  );
}
