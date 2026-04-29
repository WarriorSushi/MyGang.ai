import { Image, Pressable, ScrollView, Text, View } from "react-native";
import {
  AVATAR_STYLES,
  getCharactersForAvatarStyle,
  resolveAvatarUrl,
  type AvatarStyle,
} from "@mygang/shared";
import { PrimaryButton } from "../primary-button";

const SITE_URL = "https://mygang.ai";

type AvatarStyleStepProps = {
  selectedStyle: AvatarStyle;
  onSelectStyle: (style: AvatarStyle) => void;
  onNext: () => void;
};

const PACK_META: Record<
  AvatarStyle,
  {
    title: string;
    description: string;
    isGift: boolean;
  }
> = {
  robots: { title: "Robots", description: "Bold and classic.", isGift: false },
  human: { title: "Human", description: "Lifelike and cinematic.", isGift: true },
  retro: { title: "Retro", description: "Nostalgic and playful.", isGift: true },
};

const PREVIEW_HERO_ID = "sage";
const PREVIEW_SUPPORT_IDS = ["nyx", "atlas", "luna"];

function PackPreview({ style }: { style: AvatarStyle }) {
  const characters = getCharactersForAvatarStyle(style);
  const hero =
    characters.find((c) => c.id === PREVIEW_HERO_ID) ?? characters[0];
  const supports = PREVIEW_SUPPORT_IDS.map((id) =>
    characters.find((c) => c.id === id)
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  if (!hero) return null;

  const heroUrl = `${SITE_URL}${resolveAvatarUrl(hero.id, style)}`;

  return (
    <View className="gap-2">
      <View className="aspect-[1.15/1] overflow-hidden rounded-2xl bg-zinc-800">
        <Image source={{ uri: heroUrl }} className="h-full w-full" resizeMode="cover" />
      </View>
      <View className="flex-row gap-2">
        {supports.map((c) => {
          const url = `${SITE_URL}${resolveAvatarUrl(c.id, style)}`;
          return (
            <View
              key={c.id}
              className="flex-1 aspect-square overflow-hidden rounded-xl border border-white/10 bg-zinc-800"
            >
              <Image source={{ uri: url }} className="h-full w-full" resizeMode="cover" />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function AvatarStyleStep({
  selectedStyle,
  onSelectStyle,
  onNext,
}: AvatarStyleStepProps) {
  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="px-6 pb-32">
        <Text className="mt-4 text-center text-2xl font-black text-white">
          Pick your gang's look
        </Text>
        <Text className="mb-4 text-center text-sm text-zinc-400">
          Choose one avatar pack for the whole app.
        </Text>

        <View className="gap-3">
          {AVATAR_STYLES.map((style) => {
            const meta = PACK_META[style];
            const isSelected = selectedStyle === style;
            return (
              <Pressable
                key={style}
                onPress={() => onSelectStyle(style)}
                className={`overflow-hidden rounded-3xl border-2 bg-zinc-900/60 p-3 ${
                  isSelected ? "border-white" : "border-zinc-800"
                }`}
              >
                {meta.isGift ? (
                  <View className="absolute right-0 top-0 z-10 -translate-y-2 translate-x-4 rotate-45 bg-red-500 px-8 py-1">
                    <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white">
                      Free Gift
                    </Text>
                  </View>
                ) : null}
                <View className="rounded-2xl bg-zinc-800/80 p-2">
                  <PackPreview style={style} />
                </View>
                <View className="mt-3 flex-row items-start justify-between gap-3 px-1">
                  <View className="flex-1">
                    <Text className="text-xl font-semibold text-white">
                      {meta.title}
                    </Text>
                    <Text className="mt-0.5 text-xs text-zinc-400">
                      {meta.description}
                    </Text>
                  </View>
                  {isSelected ? (
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-white">
                      <Text className="text-xs font-bold text-zinc-950">✓</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/95 px-6 py-3 pb-6">
        <PrimaryButton
          label={`Continue with ${PACK_META[selectedStyle].title}`}
          onPress={onNext}
        />
      </View>
    </View>
  );
}
