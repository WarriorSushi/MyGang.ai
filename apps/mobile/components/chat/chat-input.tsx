import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type ChatInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    onSend(trimmed);
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View className="flex-row items-end gap-2 border-t border-zinc-800 bg-zinc-950 px-3 py-2 pb-4">
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={disabled ? "Waiting…" : "Message your gang"}
        placeholderTextColor="#71717a"
        editable={!disabled}
        multiline
        maxLength={2000}
        className="max-h-32 flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-base text-white"
      />
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        className={`h-10 items-center justify-center rounded-full px-5 ${
          canSend ? "bg-white active:bg-zinc-200" : "bg-zinc-800"
        }`}
      >
        <Text
          className={`text-sm font-semibold ${
            canSend ? "text-zinc-950" : "text-zinc-500"
          }`}
        >
          Send
        </Text>
      </Pressable>
    </View>
  );
}
