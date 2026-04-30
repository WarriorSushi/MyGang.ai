import { Modal, Pressable, Text, View } from "react-native";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

type MessageActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onReact: (emoji: string) => void;
  canReact: boolean;
};

export function MessageActionsSheet({
  visible,
  onClose,
  onCopy,
  onReact,
  canReact,
}: MessageActionsSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-3xl border-t border-border bg-card px-4 pb-8 pt-3"
        >
          <View className="mb-3 self-center h-1 w-10 rounded-full bg-secondary" />

          {canReact ? (
            <View className="mb-3 flex-row justify-between rounded-2xl bg-muted p-3">
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

          <Pressable
            onPress={() => {
              onCopy();
              onClose();
            }}
            className="rounded-2xl bg-muted px-4 py-3 active:bg-secondary"
          >
            <Text className="text-base text-foreground">Copy</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            className="mt-2 rounded-2xl bg-muted px-4 py-3 active:bg-secondary"
          >
            <Text className="text-center text-base text-muted-foreground">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
