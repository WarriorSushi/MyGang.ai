import { View } from "react-native";
import { useColorScheme } from "nativewind";

type StepIndicatorProps = {
  total: number;
  /** Zero-based index of the current step. */
  current: number;
};

export function StepIndicator({ total, current }: StepIndicatorProps) {
  const { colorScheme } = useColorScheme();
  const inactiveColor =
    colorScheme === "light" ? "rgba(45,49,56,0.18)" : "rgba(255,255,255,0.18)";

  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const isPast = i < current;
        const isCurrent = i === current;
        return (
          <View
            key={i}
            className="rounded-full"
            style={{
              width: isCurrent ? 10 : 6,
              height: isCurrent ? 10 : 6,
              backgroundColor:
                isPast || isCurrent ? "#3eddc0" : inactiveColor,
            }}
          />
        );
      })}
    </View>
  );
}
