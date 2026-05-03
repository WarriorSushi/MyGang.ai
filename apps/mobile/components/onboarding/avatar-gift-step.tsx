import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Gift } from "lucide-react-native";
import { CHARACTERS, resolveAvatarUrl } from "@mygang/shared";
import { PrimaryButton } from "../primary-button";

const SITE_URL = "https://mygang.ai";
const TILE_W = 64;
const TILE_GAP = 12;
const MARQUEE_DURATION_MS = 25000;

type AvatarGiftStepProps = {
  onNext: () => void;
};

type MarqueeRowProps = {
  characterIds: string[];
  packStyle: "human" | "retro";
  packLabel: string;
  direction: "left" | "right";
};

function MarqueeRow({
  characterIds,
  packStyle,
  packLabel,
  direction,
}: MarqueeRowProps) {
  // Render the tiles twice so the loop is seamless.
  const tiles = [...characterIds, ...characterIds];
  const offset = useSharedValue(0);

  useEffect(() => {
    const total = characterIds.length * (TILE_W + TILE_GAP);
    const from = direction === "left" ? 0 : -total;
    const to = direction === "left" ? -total : 0;
    offset.value = from;
    offset.value = withRepeat(
      withTiming(to, {
        duration: MARQUEE_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [characterIds.length, direction, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View className="relative h-20 overflow-hidden rounded-2xl">
      <Animated.View
        style={[
          animatedStyle,
          {
            flexDirection: "row",
            gap: TILE_GAP,
            alignItems: "center",
            height: "100%",
          },
        ]}
      >
        {tiles.map((id, i) => (
          <View
            key={`${id}-${i}`}
            style={{ width: TILE_W, height: TILE_W }}
            className="overflow-hidden rounded-2xl border border-border bg-muted"
          >
            <Image
              source={{ uri: `${SITE_URL}${resolveAvatarUrl(id, packStyle)}` }}
              style={{ width: TILE_W, height: TILE_W }}
              contentFit="cover"
              transition={150}
            />
          </View>
        ))}
      </Animated.View>

      {/* Edge fade gradients */}
      <LinearGradient
        colors={["#161924", "rgba(22,25,36,0)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 32,
        }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(22,25,36,0)", "#161924"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: 32,
        }}
        pointerEvents="none"
      />

      {/* Center pack label pill */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: [{ translateX: -32 }, { translateY: -12 }],
        }}
        className="rounded-full border border-border bg-card-translucent px-3 py-1"
      >
        <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
          {packLabel}
        </Text>
      </View>
    </View>
  );
}

function AnimatedGiftIcon() {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(-20);

  useEffect(() => {
    scale.value = withDelay(100, withTiming(1, { duration: 380 }));
    rotate.value = withDelay(100, withTiming(0, { duration: 380 }));
  }, [rotate, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="h-14 w-14 items-center justify-center rounded-full bg-amber-500/15"
    >
      <Gift size={28} color="#fbbf24" strokeWidth={2.4} />
    </Animated.View>
  );
}

export function AvatarGiftStep({ onNext }: AvatarGiftStepProps) {
  const characterIds = CHARACTERS.map((c) => c.id);

  return (
    <View className="flex-1 items-center justify-center px-4">
      <View className="w-full max-w-md items-center rounded-3xl border border-border bg-card-translucent p-6">
        <AnimatedGiftIcon />

        <Animated.Text
          entering={FadeIn.delay(150).duration(300)}
          className="mt-4 text-center text-3xl font-black text-foreground"
        >
          Free for Life
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(250).duration(300)}
          className="mt-1 text-center text-base font-semibold text-foreground"
        >
          Gift from us to you.
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(300).duration(300)}
          className="mb-5 mt-2 text-center text-xs text-muted-foreground"
        >
          As an early user,{" "}
          <Text className="font-bold text-foreground">
            Human and Retro avatar packs are unlocked forever
          </Text>
          .
        </Animated.Text>

        <View className="w-full gap-2">
          <MarqueeRow
            characterIds={characterIds}
            packStyle="human"
            packLabel="HUMAN"
            direction="left"
          />
          <MarqueeRow
            characterIds={characterIds}
            packStyle="retro"
            packLabel="RETRO"
            direction="right"
          />
        </View>

        <View className="mt-6 w-full">
          <PrimaryButton
            label="Continue"
            onPress={onNext}
            size="lg"
            iconRight={ArrowRight}
          />
        </View>
      </View>
    </View>
  );
}
