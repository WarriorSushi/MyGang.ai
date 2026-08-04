import { Stack, useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Sentry from "@sentry/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useColorScheme } from "nativewind";

import "../global.css";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { LoadingScreen } from "../components/loading-screen";
import { configureForegroundHandler } from "../lib/push";
import { AppErrorBoundary } from "../components/app-error-boundary";
import { SENTRY_DSN } from "../lib/config";

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  tracesSampleRate: __DEV__ ? 0 : 0.2,
  profilesSampleRate: 0,
});

function RouteGate() {
  const { session, profile, isLoading } = useAuth();
  const { colorScheme } = useColorScheme();
  const segments = useSegments();
  const params = useLocalSearchParams<{ retake?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const segs = segments as string[];
    const inAuthGroup = segs[0] === "(auth)";
    const inAppGroup = segs[0] === "(app)";
    const onResetPasswordScreen = inAuthGroup && segs[1] === "reset-password";
    const onOnboardingScreen = inAppGroup && segs[1] === "onboarding";
    const isRetakeOnboarding =
      onOnboardingScreen && params.retake === "true";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (session && !inAppGroup && !onResetPasswordScreen) {
      // Just signed in (or app launched with a session) — go into the app group.
      router.replace("/(app)");
      return;
    }

    if (session && inAppGroup) {
      // We're inside the app. Check onboarding status.
      const needsOnboarding = !profile || !profile.onboarding_completed;
      if (needsOnboarding && !onOnboardingScreen) {
        router.replace("/(app)/onboarding");
      } else if (!needsOnboarding && onOnboardingScreen && !isRetakeOnboarding) {
        router.replace("/(app)");
      }
    }
  }, [session, profile, isLoading, segments, params.retake, router]);

  // Foreground notification config + tap-to-open chat deep link.
  // Lives outside the auth gate so the listener is always wired; if the user
  // taps a notification while signed-out, the route gate will bounce them to
  // sign-in and the navigation no-ops.
  useEffect(() => {
    configureForegroundHandler();
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(app)/chat");
    });
    return () => {
      sub.remove();
    };
  }, [router]);

  if (isLoading) {
    return <LoadingScreen label="Waking up the gang…" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Disable cross-fade/slide transitions. On Android with new arch +
        // react-native-screens, the default screen transition briefly composites
        // the outgoing snapshot over the incoming screen, which reads as a
        // translucent wash over chat + header during the ~250ms transition.
        // Instant cuts also match the user's no-busy-animations preference.
        animation: "none",
        // Pin the screen container's bg color so RN's default white window bg
        // never flashes through during mount or unmount.
        contentStyle: {
          backgroundColor: colorScheme === "light" ? "#eff3f8" : "#161924",
        },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

function ThemeSync() {
  const { profile, isLoading } = useAuth();
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    if (isLoading) return;
    const next = profile?.theme === "light" ? "light" : "dark";
    if (colorScheme !== next) {
      setColorScheme(next);
    }
  }, [profile?.theme, isLoading, colorScheme, setColorScheme]);

  return <StatusBar style={colorScheme === "light" ? "dark" : "light"} />;
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppErrorBoundary>
          <AuthProvider>
            <RouteGate />
            <ThemeSync />
          </AuthProvider>
        </AppErrorBoundary>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
