import { Image, Pressable, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import {
  resolveAvatarUrl,
  type AvatarStyle,
  type CharacterCatalogEntry,
} from "@mygang/shared";

const SITE_URL = "https://mygang.ai";

type EmptyStateProps = {
  gang: CharacterCatalogEntry[];
  avatarStyle: AvatarStyle;
  username?: string | null;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyState({
  gang,
  avatarStyle,
  username,
  actionLabel,
  onActionPress,
}: EmptyStateProps) {
  const greeting = username ? `Hey ${username}.` : "Hey.";
  const hasGang = gang.length > 0;

  return (
    <View className="flex-1 items-center justify-center px-6">
      {hasGang ? (
        <View className="mb-6 flex-row -space-x-3">
          {gang.slice(0, 6).map((c) => {
            const url = `${SITE_URL}${resolveAvatarUrl(c.id, avatarStyle)}`;
            return (
              <View
                key={c.id}
                className="h-14 w-14 overflow-hidden rounded-full border-2 border-background bg-muted"
              >
                <Image
                  source={{ uri: url }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              </View>
            );
          })}
        </View>
      ) : null}
      <Text className="text-center text-2xl font-bold text-foreground">
        {hasGang ? greeting : "Your gang needs a lineup"}
      </Text>
      <Text className="mt-2 text-center text-muted-foreground">
        {hasGang
          ? "Your gang's online. Send a message to get going."
          : "Pick at least two friends before the chat room opens."}
      </Text>
      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          className="mt-5 min-h-11 flex-row items-center justify-center gap-2 rounded-full bg-primary px-5 active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text className="text-sm font-bold uppercase tracking-wider text-primary-foreground">
            {actionLabel}
          </Text>
          <ArrowRight size={14} color="#1a1d24" strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
}
