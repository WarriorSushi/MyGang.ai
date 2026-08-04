import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { AlertTriangle, type LucideIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Required when twoStep=true. Label after first tap. */
  confirmLabelStep2?: string;
  cancelLabel?: string;
  icon?: LucideIcon;
  variant?: "destructive" | "neutral";
  /** When true, the confirm button requires two taps. Label changes after tap 1. */
  twoStep?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  confirmLabelStep2,
  cancelLabel = "Cancel",
  icon: Icon = AlertTriangle,
  variant = "neutral",
  twoStep = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [armed, setArmed] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDestructive = variant === "destructive";
  const isLight = colorScheme === "light";

  function handleConfirm() {
    if (twoStep && !armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    void onConfirm();
  }

  function handleCancel() {
    setArmed(false);
    onCancel();
  }

  const buttonLabel =
    twoStep && armed && confirmLabelStep2 ? confirmLabelStep2 : confirmLabel;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable
        className="flex-1"
        onPress={handleCancel}
        accessible={false}
      >
        <BlurView
          intensity={20}
          tint={isLight ? "light" : "dark"}
          style={StyleSheet.absoluteFill}
        />
        <View
          className="absolute inset-0"
          style={{
            backgroundColor: isLight
              ? "rgba(15,23,42,0.22)"
              : "rgba(0,0,0,0.6)",
          }}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Pressable
            onPress={(e) => e.stopPropagation()}
            accessible={false}
            accessibilityViewIsModal
            className="w-full max-w-md overflow-hidden rounded-3xl border border-border"
            style={{
              backgroundColor: isLight
                ? "rgba(255,255,255,0.96)"
                : "rgba(7,12,20,0.92)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 24 },
              shadowOpacity: isLight ? 0.16 : 0.5,
              shadowRadius: 40,
              elevation: 16,
            }}
          >
            <View className="items-center px-6 pt-8">
              <View
                className="mb-4 h-14 w-14 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isDestructive
                    ? "rgba(236,94,94,0.18)"
                    : "rgba(62,221,192,0.18)",
                }}
              >
                <Icon
                  size={26}
                  color={isDestructive ? "#fca5a5" : "#5eead4"}
                  strokeWidth={2.2}
                />
              </View>
              <Text
                className="text-center text-xl font-bold text-foreground"
                accessibilityRole="header"
              >
                {title}
              </Text>
              <Text className="mt-2 text-center text-sm text-muted-foreground">
                {body}
              </Text>
            </View>

            <View className="flex-row gap-3 px-6 pb-6 pt-6">
              <View className="flex-1">
                <Pressable
                  onPress={handleCancel}
                  className="h-11 items-center justify-center rounded-full border border-border bg-card"
                  accessibilityRole="button"
                  accessibilityLabel={cancelLabel}
                >
                  <Text className="text-sm font-semibold text-foreground">
                    {cancelLabel}
                  </Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Pressable
                  onPress={handleConfirm}
                  className="h-11 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isDestructive ? "#dc2626" : "#3eddc0",
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={buttonLabel}
                  accessibilityHint={
                    twoStep && !armed
                      ? "Requires one more confirmation tap"
                      : undefined
                  }
                >
                  <Text
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: isDestructive ? "#fff" : "#1a1d24" }}
                  >
                    {buttonLabel}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
