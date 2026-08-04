import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthScreenFrameProps = {
  children: ReactNode;
  contentClassName?: string;
} & Pick<ScrollViewProps, "keyboardShouldPersistTaps">;

export function AuthScreenFrame({
  children,
  contentClassName = "flex-grow justify-center px-5 py-12",
  keyboardShouldPersistTaps = "handled",
}: AuthScreenFrameProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName={contentClassName}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        >
          <View className="w-full max-w-xl self-center">{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
