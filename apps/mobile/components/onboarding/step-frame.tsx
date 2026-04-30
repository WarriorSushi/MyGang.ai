import { type ReactNode } from "react";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

type StepFrameProps = {
  /** Unique step key — when this changes, the new step animates in. */
  stepKey: string;
  children: ReactNode;
};

/**
 * Wraps each onboarding step with a Reanimated entering/exiting animation.
 * Mirrors the web's framer-motion `AnimatePresence mode="wait"` pattern:
 * outgoing fades out; incoming fades in. Uses Reanimated's layout
 * animation primitives so transitions run on the UI thread.
 */
export function StepFrame({ stepKey, children }: StepFrameProps) {
  return (
    <Animated.View
      key={stepKey}
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(180)}
      style={{ flex: 1 }}
    >
      {children}
    </Animated.View>
  );
}
