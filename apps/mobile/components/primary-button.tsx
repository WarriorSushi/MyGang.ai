import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from "react-native";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  size?: "default" | "lg" | "xl";
  style?: StyleProp<ViewStyle>;
};

const SIZE_CLASSES: Record<NonNullable<PrimaryButtonProps["size"]>, string> = {
  default: "h-11 rounded-2xl px-5",
  lg: "h-14 rounded-2xl px-7",
  xl: "h-16 rounded-3xl px-8",
};

const TEXT_SIZE: Record<NonNullable<PrimaryButtonProps["size"]>, string> = {
  default: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

// Teal-tinted shadow underneath the button so the brand color glows softly.
// Mirrors web's `shadow-lg shadow-primary/10` style of accent halos.
const ACTIVE_SHADOW = {
  shadowColor: "#3eddc0",
  shadowOpacity: 0.32,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 10,
};

export function PrimaryButton({
  label,
  onPress,
  isLoading = false,
  disabled = false,
  size = "lg",
  style,
}: PrimaryButtonProps) {
  const inactive = disabled || isLoading;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      style={[!inactive ? ACTIVE_SHADOW : undefined, style]}
      className={`${SIZE_CLASSES[size]} flex-row items-center justify-center ${
        inactive ? "bg-secondary" : "bg-primary active:opacity-90"
      }`}
    >
      {isLoading ? (
        <ActivityIndicator color="#1a1d24" />
      ) : (
        <Text
          className={`${TEXT_SIZE[size]} font-bold ${
            inactive ? "text-muted-foreground" : "text-primary-foreground"
          }`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
