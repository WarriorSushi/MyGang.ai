import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Check, Loader2 } from "lucide-react-native";
import { useReducedMotion } from "../../lib/use-reduced-motion";

export const LOADING_STEP_DURATION_MS = 1600;

type LoadingStepProps = {
  states: { text: string }[];
  onComplete: () => void;
};

function StepIcon({ isPast, isCurrent }: { isPast: boolean; isCurrent: boolean }) {
  const rotate = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    if (isCurrent) {
      rotate.value = 0;
      rotate.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      );
    }
  }, [isCurrent, rotate, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  if (isPast) {
    return (
      <View className="h-5 w-5 items-center justify-center rounded-full bg-primary/30">
        <Check size={12} color="#3eddc0" strokeWidth={3} />
      </View>
    );
  }
  if (isCurrent) {
    return (
      <Animated.View style={animStyle}>
        <Loader2 size={20} color="#3eddc0" strokeWidth={2.4} />
      </Animated.View>
    );
  }
  return null;
}

export function LoadingStep({ states, onComplete }: LoadingStepProps) {
  const [index, setIndex] = useState(0);

  // Hold onComplete in a ref so the animation effect can stay deps-free
  // and never re-run mid-animation when the parent re-renders.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function tick(i: number) {
      if (cancelled) return;
      if (i < states.length - 1) {
        timer = setTimeout(() => {
          if (cancelled) return;
          setIndex(i + 1);
          tick(i + 1);
        }, LOADING_STEP_DURATION_MS);
      } else {
        // Final state — wait one duration, then fire onComplete.
        timer = setTimeout(() => {
          if (!cancelled) onCompleteRef.current();
        }, LOADING_STEP_DURATION_MS);
      }
    }

    tick(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // Intentionally empty deps — animation runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="w-full max-w-sm">
        {states.map((state, i) => {
          if (i > index) return null;
          const isCurrent = i === index;
          const isPast = i < index;
          return (
            <Animated.View
              key={i}
              entering={FadeInUp.duration(280)}
              className={`mb-3 flex-row items-center gap-3 ${
                isCurrent ? "" : "opacity-50"
              }`}
            >
              <StepIcon isPast={isPast} isCurrent={isCurrent} />
              <Text
                className={`flex-1 text-base ${
                  isCurrent
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {state.text}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

export function buildLoadingStates(squad: { displayName: string }[], userName?: string) {
  const names = squad.map((c) => c.displayName);
  const first = names[0] ?? "your crew";
  const second = names[1];
  const third = names[2];
  const allNames =
    names.length > 1
      ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1]
      : first;

  const steps: { text: string }[] = [
    { text: "okay, this is actually happening" },
    { text: "your gang is on their way" },
    { text: `${first} just got the message` },
  ];

  if (second) steps.push({ text: `${second} is already excited` });
  if (third) steps.push({ text: `${third} just walked in` });

  steps.push(
    { text: "setting up your private room" },
    { text: `${allNames} are waiting for you` },
    {
      text: userName
        ? `they already know your name, ${userName}`
        : "they already know your name",
    },
    { text: "these friendships are about to feel very real" },
    { text: "they'll remember everything you tell them" },
    { text: "they're going to have opinions about each other too" },
    { text: "your gang chat is ready" },
    { text: "let's go 🎉" },
  );

  return steps;
}
