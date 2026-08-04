import { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { ArrowRight } from "lucide-react-native";
import {
  AVATAR_STYLES,
  getCharactersForAvatarStyle,
  resolveAvatarUrl,
  type AvatarStyle,
} from "@mygang/shared";
import { PrimaryButton } from "../primary-button";

const SITE_URL = "https://mygang.ai";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
// Card occupies 86% of viewport width — leaves ~14% for the next card to peek
// (split between the start of next + end of prev, indicating "swipe for more").
const CARD_W = Math.min(Math.round(SCREEN_WIDTH * 0.86), 520);
const CARD_FULL = CARD_W + CARD_GAP;
// Center-snap padding so each card centers in the viewport when settled.
const SIDE_PADDING = Math.round((SCREEN_WIDTH - CARD_W) / 2);

type AvatarStyleStepProps = {
  selectedStyle: AvatarStyle;
  onSelectStyle: (style: AvatarStyle) => void;
  onNext: () => void;
};

const STYLE_LABEL: Record<AvatarStyle, string> = {
  robots: "Robots",
  human: "Human",
  retro: "Retro",
};

const STYLE_TAGLINE: Record<AvatarStyle, string> = {
  robots: "Bold and classic.",
  human: "Lifelike and cinematic.",
  retro: "Nostalgic and playful.",
};

const PREVIEW_HERO_ID = "sage";
const PREVIEW_SUPPORT_IDS = ["nyx", "atlas", "luna"];

function PackCard({
  style,
  isSelected,
  onSelect,
}: {
  style: AvatarStyle;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isGift = style === "human" || style === "retro";
  const characters = getCharactersForAvatarStyle(style);
  const hero =
    characters.find((c) => c.id === PREVIEW_HERO_ID) ?? characters[0];
  const supports = PREVIEW_SUPPORT_IDS.map((id) =>
    characters.find((c) => c.id === id)
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  if (!hero) return null;

  const heroUrl = `${SITE_URL}${resolveAvatarUrl(hero.id, style)}`;

  return (
    <Pressable
      onPress={onSelect}
      style={{ width: CARD_W }}
      accessibilityRole="button"
      accessibilityLabel={`${STYLE_LABEL[style]} avatar pack. ${STYLE_TAGLINE[style]}`}
      accessibilityState={{ selected: isSelected }}
    >
      {/* Outer halo wrapper — simulates ring-[3px] ring-primary/35 */}
      <View
        className={`rounded-[28px] ${
          isSelected ? "bg-primary/35" : "bg-transparent"
        }`}
        style={{ padding: isSelected ? 3 : 0 }}
      >
        <View
          className={`overflow-hidden rounded-3xl border-[3px] bg-card ${
            isSelected ? "border-primary" : "border-transparent"
          }`}
          style={
            isSelected
              ? {
                  shadowColor: "#3eddc0",
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 6,
                }
              : undefined
          }
        >
          {/* Hero image */}
          <View className="relative h-72 w-full bg-muted">
            <Image
              source={{ uri: heroUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={150}
            />
            {/* Pack label pill, centered horizontally near bottom of hero */}
            <View
              className="absolute self-center rounded-full border border-border bg-card-translucent px-4 py-1"
              style={{ bottom: 12, alignSelf: "center" }}
            >
              <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
                {STYLE_LABEL[style]}
              </Text>
            </View>
            {/* FREE GIFT diagonal ribbon (top-right corner) */}
            {isGift ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 18,
                  right: -36,
                  width: 160,
                  transform: [{ rotate: "45deg" }],
                }}
              >
                <View
                  className="bg-red-500"
                  style={{
                    paddingVertical: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.35,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  <Text className="text-[11px] font-black uppercase tracking-wider text-white">
                    FREE GIFT
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Thumbnails row */}
          <View className="flex-row gap-2 px-4 py-3">
            {supports.map((c, i) => {
              const isLast = i === supports.length - 1;
              const url = `${SITE_URL}${resolveAvatarUrl(c.id, style)}`;
              return (
                <View
                  key={c.id}
                  className="relative h-20 flex-1 overflow-hidden rounded-xl border border-border bg-muted"
                >
                  <Image
                    source={{ uri: url }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={150}
                  />
                  {isLast ? (
                    <View className="absolute inset-0 items-center justify-center bg-black/60">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-white">
                        10+ more
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Title + tagline */}
          <View className="px-4 pb-4">
            <Text className="text-xl font-black text-foreground">
              {STYLE_LABEL[style]}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {STYLE_TAGLINE[style]}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function AvatarStyleStep({
  selectedStyle,
  onSelectStyle,
  onNext,
}: AvatarStyleStepProps) {
  const styles = AVATAR_STYLES as readonly AvatarStyle[];
  const [centeredIndex, setCenteredIndex] = useState(() => {
    const idx = styles.indexOf(selectedStyle);
    return idx >= 0 ? idx : 0;
  });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / CARD_FULL);
    if (idx !== centeredIndex && idx >= 0 && idx < styles.length) {
      setCenteredIndex(idx);
    }
  };

  const dotIndices = useMemo(() => styles.map((_, i) => i), [styles]);

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mt-4 px-6 text-center text-2xl font-black text-foreground">
          {"Pick your gang's look"}
        </Text>
        <Text className="mb-4 px-6 text-center text-sm text-muted-foreground">
          Swipe to see all packs.
        </Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={styles}
          keyExtractor={(s) => s}
          contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
          ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
          snapToInterval={CARD_FULL}
          snapToAlignment="center"
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item: style }) => (
            <PackCard
              style={style}
              isSelected={selectedStyle === style}
              onSelect={() => onSelectStyle(style)}
            />
          )}
        />

        {/* Carousel position dots — clear "there are more cards" affordance */}
        <View className="mt-4 flex-row items-center justify-center gap-2">
          {dotIndices.map((i) => {
            const isActive = i === centeredIndex;
            return (
              <View
                key={i}
                style={{
                  width: isActive ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isActive ? "#3eddc0" : "rgba(255,255,255,0.18)",
                }}
              />
            );
          })}
        </View>
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 flex-row items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 pb-6">
        <Text className="flex-1 text-xs text-muted-foreground">
          You have selected the{" "}
          <Text className="font-bold text-foreground">
            {STYLE_LABEL[selectedStyle]}
          </Text>{" "}
          avatar pack.
        </Text>
        {/* Button auto-sizes to its content (with internal px-5 from PrimaryButton).
            Old fixed w-44 squeezed long labels against the rounded edges. */}
        <View>
          <PrimaryButton
            label={`Continue with ${STYLE_LABEL[selectedStyle]}`}
            onPress={onNext}
            size="default"
            iconRight={ArrowRight}
          />
        </View>
      </View>
    </View>
  );
}
