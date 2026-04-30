import { ActivityIndicator, Text, View } from "react-native";

export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#ffffff" />
      <Text className="mt-3 text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}
