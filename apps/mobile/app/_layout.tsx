import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

import "../global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";

const sentryDsn = (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.1,
    debug: __DEV__,
  });
}

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;
