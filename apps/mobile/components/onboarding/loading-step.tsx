import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export const LOADING_STEP_DURATION_MS = 1600;

type LoadingStepProps = {
  states: { text: string }[];
  onComplete: () => void;
};

export function LoadingStep({ states, onComplete }: LoadingStepProps) {
  const [index, setIndex] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (index < states.length - 1) {
      const t = setTimeout(() => {
        setIndex((i) => i + 1);
      }, LOADING_STEP_DURATION_MS);
      return () => clearTimeout(t);
    }
    if (!completedRef.current) {
      completedRef.current = true;
      const t = setTimeout(onComplete, LOADING_STEP_DURATION_MS);
      return () => clearTimeout(t);
    }
  }, [index, states.length, onComplete]);

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <ActivityIndicator color="#ffffff" size="large" />
      <View className="mt-8 max-w-xs">
        {states.map((state, i) => {
          const isCurrent = i === index;
          const isPast = i < index;
          if (i > index) return null;
          return (
            <Text
              key={i}
              className={`mb-2 text-center text-base ${
                isCurrent ? "text-foreground font-semibold" : "text-muted-foreground/50"
              }`}
            >
              {isPast ? "✓ " : ""}
              {state.text}
            </Text>
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
