import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect } from "react";

import "../global.css";
import { AuthProvider, useAuth } from "../lib/auth-context";

function RouteGate() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const segs = segments as string[];
    const inAuthGroup = segs[0] === "(auth)";
    const inAppGroup = segs[0] === "(app)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && !inAppGroup) {
      router.replace("/(app)");
    }
  }, [session, isLoading, segments, router]);

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
