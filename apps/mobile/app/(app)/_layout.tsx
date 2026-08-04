import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

export default function AppLayout() {
  const { colorScheme } = useColorScheme();
  // Mirrors the root Stack: disable transition fades + pin a dark contentStyle
  // so chat / sub-screens never flash a white frame behind them during nav.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: {
          backgroundColor: colorScheme === "light" ? "#eff3f8" : "#161924",
        },
      }}
    />
  );
}
