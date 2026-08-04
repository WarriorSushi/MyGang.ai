import { useEffect } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useReducedMotion } from "../../lib/use-reduced-motion";

const PARTICLES = [
  { x: 0.07, color: "#3eddc0", delay: 0, duration: 1900, turn: 260 },
  { x: 0.15, color: "#d56db5", delay: 180, duration: 2200, turn: -320 },
  { x: 0.24, color: "#fbbf24", delay: 60, duration: 2100, turn: 420 },
  { x: 0.33, color: "#60a5fa", delay: 300, duration: 1800, turn: -280 },
  { x: 0.42, color: "#f472b6", delay: 120, duration: 2300, turn: 350 },
  { x: 0.51, color: "#34d399", delay: 20, duration: 2000, turn: -400 },
  { x: 0.6, color: "#c084fc", delay: 250, duration: 2200, turn: 290 },
  { x: 0.69, color: "#f97316", delay: 90, duration: 1850, turn: -360 },
  { x: 0.78, color: "#2dd4bf", delay: 330, duration: 2150, turn: 410 },
  { x: 0.87, color: "#fb7185", delay: 140, duration: 1950, turn: -300 },
  { x: 0.94, color: "#a3e635", delay: 230, duration: 2250, turn: 380 },
] as const;

type ParticleProps = (typeof PARTICLES)[number] & {
  width: number;
  distance: number;
  reducedMotion: boolean;
};

function Particle({
  x,
  color,
  delay,
  duration,
  turn,
  width,
  distance,
  reducedMotion,
}: ParticleProps) {
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [delay, duration, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion
      ? 0
      : interpolate(progress.value, [0, 0.08, 0.82, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: progress.value * distance },
      { rotate: `${progress.value * turn}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: width * x, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

export function PurchaseCelebration({
  plan,
  onComplete,
}: {
  plan: "basic" | "pro" | null;
  onComplete: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!plan) return;
    const timer = setTimeout(onComplete, reducedMotion ? 2400 : 4200);
    return () => clearTimeout(timer);
  }, [onComplete, plan, reducedMotion]);

  if (!plan) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {PARTICLES.map((particle) => (
        <Particle
          key={`${particle.x}-${particle.color}`}
          {...particle}
          width={width}
          distance={Math.max(360, height * 0.72)}
          reducedMotion={reducedMotion}
        />
      ))}
      <Animated.View
        entering={FadeInDown.duration(reducedMotion ? 1 : 320)}
        className="mx-5 mt-16 rounded-3xl border border-primary/30 bg-card px-5 py-4"
        style={styles.banner}
        accessibilityLiveRegion="polite"
      >
        <Text className="text-center text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
          The gang is celebrating
        </Text>
        <Text className="mt-1 text-center text-xl font-black text-foreground">
          Welcome to {plan === "pro" ? "Pro" : "Basic"} ✨
        </Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">
          Your crew has something to say about the upgrade.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  particle: {
    position: "absolute",
    top: -18,
    width: 9,
    height: 16,
    borderRadius: 3,
  },
  banner: {
    shadowColor: "#3eddc0",
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 10,
  },
});
