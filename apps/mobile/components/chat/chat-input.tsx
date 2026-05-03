import { useState } from "react";
import { Pressable, TextInput, View, Text } from "react-native";
import { ArrowRight, X } from "lucide-react-native";

const MAX_LEN = 2000;
const COUNTER_THRESHOLD = 1500;

export type ReplyTargetChip = {
  speaker: string;
  content: string;
  speakerName: string;
  speakerColor: string;
};

type ChatInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  replyTarget?: ReplyTargetChip | null;
  onCancelReply?: () => void;
};

export function ChatInput({
  onSend,
  disabled = false,
  replyTarget = null,
  onCancelReply,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !disabled;
  const showCounter = text.length >= COUNTER_THRESHOLD;
  const remaining = MAX_LEN - text.length;

  function handleSend() {
    if (!canSend) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <View className="px-3 pb-2">
      {replyTarget ? (
        <View
          className="mb-1 flex-row items-center gap-2 rounded-2xl border-l-2 bg-card-translucent px-3 py-2"
          style={{ borderLeftColor: replyTarget.speakerColor }}
        >
          <View className="flex-1">
            <Text
              className="text-[10px] font-bold"
              style={{ color: replyTarget.speakerColor }}
            >
              Replying to {replyTarget.speakerName}
            </Text>
            <Text
              className="text-xs text-muted-foreground"
              numberOfLines={1}
            >
              {replyTarget.content}
            </Text>
          </View>
          <Pressable
            onPress={onCancelReply}
            hitSlop={8}
            className="h-7 w-7 items-center justify-center rounded-full active:bg-muted"
            accessibilityRole="button"
            accessibilityLabel="Cancel reply"
          >
            <X size={14} color="#a1a1aa" strokeWidth={2.4} />
          </Pressable>
        </View>
      ) : null}
      {showCounter ? (
        <Text
          className={`mb-1 text-right text-[10px] ${
            remaining <= 100 ? "text-amber-400" : "text-muted-foreground/60"
          }`}
        >
          {remaining} chars left
        </Text>
      ) : null}
      <View className="flex-row items-end gap-2 rounded-[24px] border border-border bg-card-translucent pl-4 pr-1.5 py-1.5">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Send a message..."
          placeholderTextColor="#71717a"
          multiline
          maxLength={MAX_LEN}
          editable={!disabled}
          className="flex-1 max-h-[120px] py-2 text-base text-foreground"
          // Avoid Android line-height bug that clips emojis when multiline
          style={{ textAlignVertical: "center" }}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          className={`h-9 w-9 items-center justify-center rounded-full ${
            canSend ? "bg-primary" : "bg-muted"
          }`}
          accessibilityLabel="Send message"
        >
          <ArrowRight
            size={18}
            color={canSend ? "#1a1d24" : "#71717a"}
            strokeWidth={2.6}
          />
        </Pressable>
      </View>
    </View>
  );
}
