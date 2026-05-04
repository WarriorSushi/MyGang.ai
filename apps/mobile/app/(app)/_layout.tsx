import { Stack } from "expo-router";

export default function AppLayout() {
  // Mirrors the root Stack: disable transition fades + pin a dark contentStyle
  // so chat / sub-screens never flash a white frame behind them during nav.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: "#161924" },
      }}
    />
  );
}
