import { View, type ViewProps } from "react-native";
import { type ReactNode } from "react";

type StepTransitionProps = {
  /** Unique key for the current step. Kept for API compat. */
  stepKey: string;
  /** Direction prop kept for API compat; no-op now. */
  direction?: "forward" | "backward";
  children: ReactNode;
  style?: ViewProps["style"];
};

/**
 * No-op pass-through. Onboarding step swaps render instantly without animation.
 * (Original implementation animated horizontal slide; removed per user feedback —
 * the side-to-side motion on every screen was excessive.)
 */
export function StepTransition({
  stepKey,
  children,
  style,
}: StepTransitionProps) {
  return (
    <View key={stepKey} style={[{ flex: 1 }, style]}>
      {children}
    </View>
  );
}
