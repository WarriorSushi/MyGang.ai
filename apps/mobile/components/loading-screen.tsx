import { ActivityIndicator, Text, View } from "react-native";
import { useColorScheme } from "nativewind";

export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  const { colorScheme } = useColorScheme();
  const indicatorColor = colorScheme === "light" ? "#2d3138" : "#ffffff";

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color={indicatorColor} />
      <Text className="mt-3 text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}
