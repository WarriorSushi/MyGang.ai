import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import * as Sentry from "@sentry/react-native";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[app] render crash:", error, info.componentStack);
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: info.componentStack,
        },
      },
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-2xl font-black text-foreground">
          MyGang hit a reload hiccup
        </Text>
        <Text className="mt-3 text-center text-sm text-muted-foreground">
          The app caught a screen error instead of closing. Try again once. If
          it repeats, share what you were doing right before this appeared.
        </Text>
        <Text className="mt-4 rounded-2xl border border-border bg-card-translucent px-4 py-3 text-center text-xs text-muted-foreground">
          {this.state.error.message}
        </Text>
        <Pressable
          onPress={() => this.setState({ error: null })}
          className="mt-5 min-h-11 justify-center rounded-full bg-primary px-5 py-3"
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text className="text-sm font-bold uppercase tracking-wider text-primary-foreground">
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }
}
