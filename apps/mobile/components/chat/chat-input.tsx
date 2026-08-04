import { memo, useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View, Text } from "react-native";
import { ArrowRight, X } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  isSending?: boolean;
  sendBlocked?: boolean;
  replyTarget?: ReplyTargetChip | null;
  onCancelReply?: () => void;
  cooldownPlaceholder?: string | null;
  blockedNotice?: string | null;
  draftUserId?: string | null;
};

function draftKey(userId: string): string {
  return `mygang:chat-draft:${userId}`;
}

function ChatInputBase({
  onSend,
  isSending = false,
  sendBlocked = false,
  replyTarget = null,
  onCancelReply,
  cooldownPlaceholder = null,
  blockedNotice = null,
  draftUserId = null,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [waitNotice, setWaitNotice] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const waitNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !isSending && !sendBlocked;
  const showCounter = text.length >= COUNTER_THRESHOLD;
  const remaining = MAX_LEN - text.length;

  useEffect(() => {
    return () => {
      if (waitNoticeTimerRef.current) clearTimeout(waitNoticeTimerRef.current);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDraftReady(false);
    setText("");
    if (!draftUserId) {
      setText("");
      setDraftReady(true);
      return () => {
        cancelled = true;
      };
    }

    void AsyncStorage.getItem(draftKey(draftUserId))
      .then((draft) => {
        if (!cancelled && draft) {
          setText((current) => current || draft.slice(0, MAX_LEN));
        }
      })
      .finally(() => {
        if (!cancelled) setDraftReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [draftUserId]);

  useEffect(() => {
    if (!draftReady || !draftUserId) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      draftTimerRef.current = null;
      const operation = text
        ? AsyncStorage.setItem(draftKey(draftUserId), text)
        : AsyncStorage.removeItem(draftKey(draftUserId));
      void operation.catch(() => undefined);
    }, 250);
    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [draftReady, draftUserId, text]);

  function showTemporaryNotice(message: string) {
    setWaitNotice(message);
    if (waitNoticeTimerRef.current) clearTimeout(waitNoticeTimerRef.current);
    waitNoticeTimerRef.current = setTimeout(() => {
      waitNoticeTimerRef.current = null;
      setWaitNotice(null);
    }, 2200);
  }

  function handleSend() {
    if (!trimmed) return;
    if (sendBlocked) {
      showTemporaryNotice(
        blockedNotice ?? "Sending is temporarily unavailable. Try again shortly.",
      );
      return;
    }
    if (isSending) {
      showTemporaryNotice("Wait for the previous message to send.");
      return;
    }
    onSend(trimmed);
    setText("");
    if (draftUserId) {
      void AsyncStorage.removeItem(draftKey(draftUserId)).catch(() => undefined);
    }
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
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
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
      {waitNotice ? (
        <Text
          className="mb-1 pr-2 text-right text-[10px] text-muted-foreground"
          accessibilityLiveRegion="polite"
        >
          {waitNotice}
        </Text>
      ) : null}
      <View className="flex-row items-end gap-2 rounded-[24px] border border-border bg-card-translucent pl-4 pr-1.5 py-1.5">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={cooldownPlaceholder ?? "Send a message..."}
          placeholderTextColor="#71717a"
          multiline
          maxLength={MAX_LEN}
          editable
          accessibilityLabel="Message"
          accessibilityHint={
            isSending
              ? "Keep typing. Send becomes available when the previous message finishes."
              : sendBlocked
                ? "Keep typing. Sending is temporarily unavailable during the cooldown."
                : "Type a message to send to your gang."
          }
          className="flex-1 max-h-[120px] py-2 text-base text-foreground"
          // Avoid Android line-height bug that clips emojis when multiline
          style={{ textAlignVertical: "center" }}
        />
        <Pressable
          onPress={handleSend}
          disabled={!trimmed}
          className={`h-11 w-11 items-center justify-center rounded-full ${
            canSend ? "bg-primary" : "bg-muted"
          }`}
          accessibilityLabel="Send message"
          accessibilityHint={
            isSending ? "Wait for the previous message to finish." : undefined
          }
          accessibilityRole="button"
          accessibilityState={{
            disabled: !trimmed || sendBlocked,
            busy: isSending,
          }}
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

export const ChatInput = memo(ChatInputBase);
