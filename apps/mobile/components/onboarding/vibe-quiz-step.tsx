import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { VibeProfile } from "@mygang/shared";
import { PrimaryButton } from "../primary-button";

type QuestionKey = keyof VibeProfile;

type Option = { value: string; label: string; emoji: string };

type Question = {
  key: QuestionKey;
  reviewLabel: string;
  title: string;
  options: Option[];
};

const QUESTIONS: Question[] = [
  {
    key: "primary_intent",
    reviewLabel: "Crew mission",
    title: "What do you want most from your gang?",
    options: [
      { value: "hype", label: "Hype me up", emoji: "🔥" },
      { value: "honest", label: "Real talk", emoji: "💯" },
      { value: "humor", label: "Make me laugh", emoji: "😂" },
      { value: "chill", label: "Chill vibes", emoji: "🌊" },
    ],
  },
  {
    key: "warmth_style",
    reviewLabel: "Tone",
    title: "How should they talk to you?",
    options: [
      { value: "warm", label: "Warm and supportive", emoji: "💛" },
      { value: "balanced", label: "Balanced mix", emoji: "⚖️" },
      { value: "edgy", label: "Unfiltered and sarcastic", emoji: "🔥" },
    ],
  },
  {
    key: "chaos_level",
    reviewLabel: "Energy",
    title: "What's the energy?",
    options: [
      { value: "calm", label: "Keep it chill", emoji: "☕" },
      { value: "lively", label: "Lively and fun", emoji: "⚡" },
      { value: "chaotic", label: "Pure chaos", emoji: "💥" },
    ],
  },
];

type VibeQuizStepProps = {
  onNext: (vibe: VibeProfile) => void;
};

const SOFT_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.4,
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 20,
  elevation: 4,
} as const;

const SELECTED_TINT = { backgroundColor: "rgba(62,221,192,0.08)" } as const;

type OptionButtonProps = {
  option: Option;
  isSelected: boolean;
  onPress: () => void;
};

function OptionButton({ option, isSelected, onPress }: OptionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, SOFT_SHADOW]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        style={isSelected ? SELECTED_TINT : undefined}
        className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
          isSelected ? "border-primary/40" : "border-border bg-card"
        }`}
      >
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
          <Text className="text-lg">{option.emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {option.label}
          </Text>
        </View>
        {isSelected ? (
          <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
            <Text className="text-xs font-bold text-primary-foreground">✓</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function VibeQuizStep({ onNext }: VibeQuizStepProps) {
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, string>>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const isReview = currentIndex >= QUESTIONS.length;
  const allAnswered = QUESTIONS.every((q) => answers[q.key]);
  const stageKey = isReview ? "review" : `q${currentIndex + 1}`;

  function handleSelect(key: QuestionKey, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    const idx = QUESTIONS.findIndex((q) => q.key === key);
    const next = idx === QUESTIONS.length - 1 ? QUESTIONS.length : idx + 1;
    // Small delay so the user sees their selection before advancing
    setTimeout(() => setCurrentIndex(next), 150);
  }

  function jumpTo(index: number) {
    setCurrentIndex(index);
  }

  function handleConfirm() {
    if (!allAnswered) return;
    onNext(answers as VibeProfile);
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-6 pb-8">
      <Text className="mt-6 text-center text-2xl font-black text-foreground">
        Set the vibe
      </Text>
      <Text className="mb-6 text-center text-sm text-muted-foreground">
        Three quick picks.
      </Text>

      {!isReview ? (
        <View key={stageKey}>
          <View className="rounded-3xl border border-border bg-card-translucent p-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Question {currentIndex + 1} of {QUESTIONS.length}
                </Text>
                <Text className="mt-1.5 text-xl font-black text-foreground">
                  {QUESTIONS[currentIndex].title}
                </Text>
                <Text className="mt-1 text-[11px] text-muted-foreground/70">
                  Select one
                </Text>
              </View>
              {currentIndex > 0 ? (
                <Pressable
                  onPress={() => jumpTo(currentIndex - 1)}
                  className="rounded-full border border-border bg-card px-3 py-1.5"
                >
                  <Text className="text-xs font-semibold text-muted-foreground">
                    ← Back
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View className="mt-4 gap-2">
              {QUESTIONS[currentIndex].options.map((option) => {
                const isSelected =
                  answers[QUESTIONS[currentIndex].key] === option.value;
                return (
                  <OptionButton
                    key={option.value}
                    option={option}
                    isSelected={isSelected}
                    onPress={() =>
                      handleSelect(QUESTIONS[currentIndex].key, option.value)
                    }
                  />
                );
              })}
            </View>
          </View>
        </View>
      ) : null}

      {isReview ? (
        <View key={stageKey}>
          <View className="rounded-3xl border border-border bg-card-translucent p-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Review
                </Text>
                <Text className="mt-1.5 text-2xl font-black text-foreground">
                  You're all set
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
                  We'll use these answers to build your first crew.
                </Text>
              </View>
              <Pressable
                onPress={() => jumpTo(QUESTIONS.length - 1)}
                className="rounded-full border border-border bg-card px-3 py-1.5"
              >
                <Text className="text-xs font-semibold text-muted-foreground">
                  ← Back
                </Text>
              </Pressable>
            </View>

            <View className="mt-4 gap-2">
              {QUESTIONS.map((question, index) => {
                const selected = question.options.find(
                  (o) => o.value === answers[question.key]
                );
                if (!selected) return null;
                return (
                  <View
                    key={question.key}
                    className="flex-row items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
                      <Text className="text-lg">{selected.emoji}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        {question.reviewLabel}
                      </Text>
                      <Text className="mt-0.5 text-base font-semibold text-foreground">
                        {selected.label}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => jumpTo(index)}
                      className="rounded-full border border-border bg-card px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-muted-foreground">
                        Edit
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View className="mt-4">
              <PrimaryButton
                label="Confirm and continue"
                onPress={handleConfirm}
                disabled={!allAnswered}
              />
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
