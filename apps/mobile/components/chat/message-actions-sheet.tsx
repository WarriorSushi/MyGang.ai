import { BlurView } from "expo-blur";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Reply } from "lucide-react-native";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

type MessageActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onReact: (emoji: string) => void;
  canReact: boolean;
  onReply?: () => void;
};

export function MessageActionsSheet({
  visible,
  onClose,
  onCopy,
  onReact,
  canReact,
  onReply,
}: MessageActionsSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end" onPress={onClose}>
        <BlurView
          intensity={40}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View className="absolute inset-0 bg-black/40" />
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="overflow-hidden rounded-t-3xl border-t border-border"
        >
          <BlurView
            intensity={60}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View className="absolute inset-0 bg-card-translucent" />
          <View className="px-4 pb-8 pt-3">
            <View className="mb-3 self-center h-1 w-10 rounded-full bg-secondary" />

            {canReact ? (
              <View className="mb-3 flex-row justify-between rounded-2xl bg-muted/60 p-3">
                {QUICK_REACTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => {
                      onReact(emoji);
                      onClose();
                    }}
                    className="h-12 w-12 items-center justify-center rounded-full active:bg-secondary"
                  >
                    <Text className="text-2xl">{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {onReply ? (
              <Pressable
                onPress={() => {
                  onReply();
                  onClose();
                }}
                className="mb-2 flex-row items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 active:bg-secondary"
              >
                <Reply size={18} color="#e4e4e7" strokeWidth={2.2} />
                <Text className="text-base text-foreground">Reply</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                onCopy();
                onClose();
              }}
              className="rounded-2xl bg-muted/60 px-4 py-3 active:bg-secondary"
            >
              <Text className="text-base text-foreground">Copy</Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              className="mt-2 rounded-2xl bg-muted/40 px-4 py-3 active:bg-secondary"
            >
              <Text className="text-center text-base text-muted-foreground">
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
