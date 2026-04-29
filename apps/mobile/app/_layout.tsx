import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect } from "react";

import "../global.css";
import { AuthProvider, useAuth } from "../lib/auth-context";

function RouteGate() {
  const { session, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const segs = segments as string[];
    const inAuthGroup = segs[0] === "(auth)";
    const inAppGroup = segs[0] === "(app)";
    const onOnboardingScreen = inAppGroup && segs[1] === "onboarding";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (session && !inAppGroup) {
      // Just signed in (or app launched with a session) — go into the app group.
      router.replace("/(app)");
      return;
    }

    if (session && inAppGroup) {
      // We're inside the app. Check onboarding status.
      const needsOnboarding = !profile || !profile.onboarding_completed;
      if (needsOnboarding && !onOnboardingScreen) {
        router.replace("/(app)/onboarding");
      } else if (!needsOnboarding && onOnboardingScreen) {
        router.replace("/(app)");
      }
    }
  }, [session, profile, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGate />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
