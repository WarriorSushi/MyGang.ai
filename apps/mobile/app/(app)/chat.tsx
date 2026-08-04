import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Pressable, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Clipboard from "expo-clipboard";
import { runOnJS } from "react-native-reanimated";
import { getNetworkStateAsync, useNetworkState } from "expo-network";
import {
  CHARACTERS,
  applyAvatarStyleToGang,
  DEFAULT_AVATAR_STYLE,
  getContextLimit,
  getTierFromProfile,
  hasOpenFloorIntent,
  type AvatarStyle,
  type CharacterCatalogEntry,
  type ChatWallpaper,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import {
  postChat,
  postRenderedEvents,
  generateMessageId,
  type ChatRequestMessage,
  type ChatEvent,
} from "../../lib/chat-api";
import {
  loadPersistedMessages,
  savePersistedMessages,
} from "../../lib/chat-storage";
import { fetchChatHistoryPage } from "../../lib/chat-history";
import { supabase } from "../../lib/supabase";
import { MessageList } from "../../components/chat/message-list";
import { ChatInput } from "../../components/chat/chat-input";
import { ChatHeader } from "../../components/chat/chat-header";
import { AiDisclaimer } from "../../components/chat/ai-disclaimer";
import { EmptyState } from "../../components/chat/empty-state";
import { TypingIndicator } from "../../components/chat/typing-indicator";
import { MessageActionsSheet } from "../../components/chat/message-actions-sheet";
import { AvatarLightbox } from "../../components/chat/avatar-lightbox";
import { WallpaperBackground } from "../../components/chat/wallpaper-background";
import { SettingsDrawer } from "../../components/chat/settings-drawer";
import { MemoryVaultDrawer } from "../../components/chat/memory-vault-drawer";
import { PurchaseCelebration } from "../../components/chat/purchase-celebration";
import { type ChatMessage } from "../../components/chat/message-item";
import {
  getEcosystemPacingMultiplier,
  type EcosystemSpeed,
} from "../../lib/ecosystem-speed";
import {
  loadEcosystemSpeed,
  saveEcosystemSpeed,
} from "../../lib/ecosystem-speed-storage";

const MAX_EVENT_DELAY_MS = 5_000;
const MAX_TURN_PRESENTATION_MS = 30_000;

export default function ChatScreen() {
  const router = useRouter();
  const { user, profile, applyProfilePatch } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [typingCharacterId, setTypingCharacterId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [lightboxCharacter, setLightboxCharacter] =
    useState<CharacterCatalogEntry | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryVaultOpen, setMemoryVaultOpen] = useState(false);
  const [showResumedPill, setShowResumedPill] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownLabel, setCooldownLabel] = useState<string | null>(null);
  const [celebrationPlan, setCelebrationPlan] = useState<"basic" | "pro" | null>(
    null,
  );
  const [ecosystemSpeed, setEcosystemSpeed] =
    useState<EcosystemSpeed>("normal");
  const networkState = useNetworkState();
  const [confirmedOffline, setConfirmedOffline] = useState(false);
  const isOffline =
    confirmedOffline ||
    networkState.isConnected === false ||
    networkState.isInternetReachable === false;
  const userIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const isWaitingRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const autonomousBackoffUntilRef = useRef(0);
  const idleAutoCountRef = useRef(0);
  const lastUserMessageIdRef = useRef<string | null>(null);
  const currentUserMessageContentRef = useRef<string>("");
  const purchaseCelebrationTriggeredRef = useRef(false);
  const isMountedRef = useRef(true);

  const updateWaiting = useCallback((waiting: boolean) => {
    isWaitingRef.current = waiting;
    setIsWaiting(waiting);
  }, []);

  const scheduleTurnTimer = useCallback((fn: () => void, delay: number) => {
    const timer = setTimeout(() => {
      turnTimersRef.current.delete(timer);
      fn();
    }, delay);
    turnTimersRef.current.add(timer);
    return timer;
  }, []);

  const clearTurnTimers = useCallback(() => {
    turnTimersRef.current.forEach(clearTimeout);
    turnTimersRef.current.clear();
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    const reconcileNetworkState = async () => {
      try {
        const state = await getNetworkStateAsync();
        if (!mounted) return;
        setConfirmedOffline(
          state.isConnected === false || state.isInternetReachable === false,
        );
      } catch {
        // Keep the last confirmed value; a failed check is not proof of loss.
      }
    };

    void reconcileNetworkState();
    const interval = setInterval(() => {
      void reconcileNetworkState();
    }, 4_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!user?.id) {
      setEcosystemSpeed("normal");
      return () => {
        mounted = false;
      };
    }
    void loadEcosystemSpeed(user.id).then((speed) => {
      if (mounted) setEcosystemSpeed(speed);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const updateEcosystemSpeed = useCallback(
    (speed: EcosystemSpeed) => {
      setEcosystemSpeed(speed);
      if (user?.id) {
        void saveEcosystemSpeed(user.id, speed).catch(() => undefined);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTurnTimers();
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [clearTurnTimers]);

  // Hydrate persisted chat history once we know the user.
  // Strategy: AsyncStorage first (instant), then fetch from Supabase
  // chat_history (cross-device source of truth) and replace if server
  // has data. Falls back gracefully if either fails.
  useEffect(() => {
    let mounted = true;
    if (!user?.id) {
      setHasHydrated(true);
      return;
    }
    userIdRef.current = user.id;

    (async () => {
      const cached = await loadPersistedMessages(user.id);
      if (mounted && cached.length > 0) {
        setMessages(cached);
      }

      const page = await fetchChatHistoryPage(user.id);
      if (!mounted) return;
      if (page.error) {
        setHistoryError(page.error);
      } else {
        setHistoryError(null);
        setHasOlderMessages(page.hasMore);
        setHistoryCursor(page.nextBefore);
      }
      if (page.messages.length > 0) {
        setMessages(page.messages);
      }
      setHasHydrated(true);
      // Surface a "Resumed your last session" pill if any source delivered messages.
      if (cached.length > 0 || page.messages.length > 0) {
        setShowResumedPill(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Persist messages whenever they change (post-hydration only)
  useEffect(() => {
    if (!hasHydrated || !user?.id) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      void savePersistedMessages(user.id, messagesRef.current);
    }, 350);
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [messages, user?.id, hasHydrated]);

  // Auto-dismiss the "Resumed your last session" pill after ~6s.
  useEffect(() => {
    if (!showResumedPill) return;
    const t = setTimeout(() => setShowResumedPill(false), 6000);
    return () => clearTimeout(t);
  }, [showResumedPill]);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownLabel(null);
      return;
    }
    const cooldownTarget = cooldownUntil;

    function updateCooldownLabel() {
      const remaining = Math.max(0, Math.ceil((cooldownTarget - Date.now()) / 1000));
      if (remaining <= 0) {
        setCooldownUntil(null);
        setCooldownLabel(null);
        return;
      }
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setCooldownLabel(
        mins > 0
          ? `Cooldown ${mins}:${secs.toString().padStart(2, "0")}`
          : `Cooldown ${secs}s`,
      );
    }

    updateCooldownLabel();
    const timer = setInterval(updateCooldownLabel, 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const avatarStyle: AvatarStyle =
    (profile?.avatar_style_preference as AvatarStyle) ?? DEFAULT_AVATAR_STYLE;
  const wallpaper: ChatWallpaper =
    (profile?.chat_wallpaper as ChatWallpaper) ?? "default";

  const allCharacters: CharacterCatalogEntry[] = useMemo(
    () =>
      applyAvatarStyleToGang(
        CHARACTERS as CharacterCatalogEntry[],
        avatarStyle
      ) as CharacterCatalogEntry[],
    [avatarStyle]
  );

  const gangIds = useMemo<string[]>(() => {
    const raw = profile?.preferred_squad;
    if (Array.isArray(raw)) {
      return raw.filter((id): id is string => typeof id === "string");
    }
    return [];
  }, [profile?.preferred_squad]);

  const gang = useMemo(
    () => allCharacters.filter((c) => gangIds.includes(c.id)),
    [allCharacters, gangIds]
  );
  const pacingMultiplier = getEcosystemPacingMultiplier(ecosystemSpeed);

  // Render incoming events with their delay timing.
  // - "typing_ghost" events show "X is typing..." for `delay` ms.
  // - "message" events append the message after `delay` ms.
  // - other event types (reactions, status_update, nickname_update) deferred.
  const scheduleEvents = useCallback(
    (events: ChatEvent[], onComplete?: () => void) => {
      let cumulative = 0;
      events.forEach((event) => {
        const eventDelay = Math.min(
          MAX_EVENT_DELAY_MS * pacingMultiplier,
          Math.max(
            0,
            Number.isFinite(event.delay)
              ? event.delay * pacingMultiplier
              : 0,
          ),
        );
        const fireAt = cumulative;
        cumulative = Math.min(
          MAX_TURN_PRESENTATION_MS * pacingMultiplier,
          cumulative + eventDelay,
        );

        if (event.type === "typing_ghost") {
          // Show typing indicator at fireAt, hide it when the next event starts.
          scheduleTurnTimer(() => setTypingCharacterId(event.character), fireAt);
        } else if (event.type === "message" && event.content) {
          scheduleTurnTimer(() => {
            setTypingCharacterId(null);
            setMessages((prev) => [
              ...prev,
              {
                id: event.message_id ?? generateMessageId(),
                speaker: event.character,
                content: event.content!,
                created_at: new Date().toISOString(),
                source: "chat",
              },
            ]);
          }, cumulative);
        } else if (event.type === "reaction" && event.target_message_id) {
          scheduleTurnTimer(() => {
            setTypingCharacterId(null);
            setMessages((prev) => [
              ...prev,
              {
                id: event.message_id ?? generateMessageId(),
                speaker: event.character,
                content: event.content ?? "👍",
                created_at: new Date().toISOString(),
                reaction: event.content ?? "👍",
                replyToId: event.target_message_id,
                source: "chat",
              },
            ]);
          }, cumulative);
        }
      });
      // Re-enable input after the last event lands
      scheduleTurnTimer(() => {
        setTypingCharacterId(null);
        updateWaiting(false);
        onComplete?.();
      }, cumulative + 100);
    },
    [pacingMultiplier, scheduleTurnTimer, updateWaiting]
  );

  // Free tier cannot use ecosystem mode (server returns 403). Mirror the web
  // guard at auth-manager.tsx:65 — clamp to gang_focus unless tier is paid.
  const tier = (profile?.subscription_tier ?? "free") as string;
  const rawChatMode = (profile?.chat_mode as "gang_focus" | "ecosystem") ?? "gang_focus";
  const chatMode: "gang_focus" | "ecosystem" =
    tier === "free" ? "gang_focus" : rawChatMode;
  const lowCostMode = Boolean(profile?.low_cost_mode);
  const effectiveCustomNames = useMemo(
    () =>
      tier === "free"
        ? undefined
        : ((profile?.custom_character_names as Record<string, string> | null) ??
          undefined),
    [profile?.custom_character_names, tier],
  );

  const prepareEvents = useCallback((events: ChatEvent[]): ChatEvent[] => {
    return events.map((event) => {
      if (
        (event.type === "message" || event.type === "reaction") &&
        !event.message_id
      ) {
        return { ...event, message_id: generateMessageId() };
      }
      return event;
    });
  }, []);

  const persistRenderedEventsForTurn = useCallback(
    (turnId: string, events: ChatEvent[]) => {
      const renderedAtBase = Date.now();
      const renderedEvents = events
        .filter(
          (e) =>
            (e.type === "message" || e.type === "reaction") &&
            typeof e.content === "string" &&
            e.content.length > 0 &&
            typeof e.message_id === "string" &&
            e.message_id.length > 0,
        )
        .map((e, i) => ({
          message_id: e.message_id!,
          speaker: e.character,
          content: e.content!,
          displayed_at: new Date(renderedAtBase + i).toISOString(),
          ...(e.type === "reaction" ? { reaction: e.content! } : {}),
          ...(e.target_message_id
            ? { reply_to_message_id: e.target_message_id }
            : {}),
        }));

      if (renderedEvents.length > 0) {
        void postRenderedEvents({
          userId: user?.id,
          turnId,
          events: renderedEvents,
        });
      }
    },
    [user?.id],
  );

  const sendChatPayload = useCallback(
    async (
      extraMessage: ChatMessage | null,
      source: "user" | "autonomous" | "autonomous_idle" = "user",
    ) => {
      const tierForLimit = getTierFromProfile(
        profile?.subscription_tier ?? null
      );
      const contextLimit = getContextLimit(tierForLimit);
      const currentMessages = messagesRef.current;
      const baseMessages = extraMessage
        ? [
            ...currentMessages.filter((m) => m.id !== extraMessage.id),
            extraMessage,
          ]
        : currentMessages;
      // Keep the most recent contextLimit messages (mirrors web behaviour).
      const cappedMessages = baseMessages
        .filter((m) => m.deliveryStatus !== "failed")
        .slice(-contextLimit);
      const apiMessages: ChatRequestMessage[] = cappedMessages.map((m) => ({
        id: m.id,
        speaker: m.speaker,
        content: m.content,
        created_at: m.created_at,
        ...(m.reaction ? { reaction: m.reaction } : {}),
        ...(m.replyToId ? { replyToId: m.replyToId } : {}),
        ...(m.source ? { source: m.source } : {}),
      }));

      return postChat({
        messages: apiMessages,
        activeGangIds: gangIds,
        userName: profile?.username ?? null,
        chatMode,
        lowCostMode,
        source,
        autonomousIdle: source === "autonomous_idle",
      });
    },
    [
      gangIds,
      profile?.username,
      profile?.subscription_tier,
      chatMode,
      lowCostMode,
    ]
  );

  useEffect(() => {
    const pendingPlan = profile?.purchase_celebration_pending;
    if (pendingPlan !== "basic" && pendingPlan !== "pro") return;
    if (gangIds.length < 2 || isWaitingRef.current) return;
    if (purchaseCelebrationTriggeredRef.current) return;

    purchaseCelebrationTriggeredRef.current = true;
    applyProfilePatch({ purchase_celebration_pending: null });
    setCelebrationPlan(pendingPlan);
    updateWaiting(true);

    void sendChatPayload(null, "autonomous").then((result) => {
      if (!isMountedRef.current) return;
      if (!result.ok || !result.data.events?.length) {
        updateWaiting(false);
        return;
      }

      if (typeof result.data.messages_remaining === "number") {
        setMessagesRemaining(result.data.messages_remaining);
      }
      const preparedEvents = prepareEvents(result.data.events);
      scheduleEvents(preparedEvents);
      persistRenderedEventsForTurn(
        result.data.turn_id ?? `celebration-${Date.now()}`,
        preparedEvents,
      );
    });

  }, [
    applyProfilePatch,
    gangIds.length,
    isWaiting,
    persistRenderedEventsForTurn,
    prepareEvents,
    profile?.purchase_celebration_pending,
    scheduleEvents,
    sendChatPayload,
    updateWaiting,
  ]);

  const scheduleAutonomousTurn = useCallback(
    (sourceUserMessageId: string, autonomousIdle: boolean, delayMs: number) => {
      if (chatMode !== "ecosystem" || lowCostMode) return;
      if (Date.now() < autonomousBackoffUntilRef.current) return;
      if (autonomousIdle && idleAutoCountRef.current >= 1) return;

      scheduleTurnTimer(async () => {
        if (isWaitingRef.current) return;
        if (Date.now() < autonomousBackoffUntilRef.current) return;
        if (lastUserMessageIdRef.current !== sourceUserMessageId) return;

        const currentMessages = messagesRef.current;
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (!lastMessage || lastMessage.speaker === "user") return;
        if (autonomousIdle && idleAutoCountRef.current >= 1) return;

        updateWaiting(true);
        const result = await sendChatPayload(
          null,
          autonomousIdle ? "autonomous_idle" : "autonomous",
        );

        if (!result.ok) {
          updateWaiting(false);
          autonomousBackoffUntilRef.current =
            Date.now() + (result.cooldownSeconds ?? 30) * 1000;
          if (
            (result.status === 402 || result.status === 429) &&
            result.cooldownSeconds
          ) {
            setCooldownUntil(Date.now() + result.cooldownSeconds * 1000);
          }
          return;
        }

        if (result.data.paywall) {
          updateWaiting(false);
          const cooldownSeconds = result.data.cooldown_seconds ?? 300;
          setCooldownUntil(Date.now() + cooldownSeconds * 1000);
          autonomousBackoffUntilRef.current = Date.now() + cooldownSeconds * 1000;
          return;
        }

        if (typeof result.data.messages_remaining === "number") {
          setMessagesRemaining(result.data.messages_remaining);
        }

        if (!result.data.events || result.data.events.length === 0) {
          updateWaiting(false);
          return;
        }

        if (autonomousIdle) idleAutoCountRef.current += 1;
        const preparedEvents = prepareEvents(result.data.events);
        scheduleEvents(preparedEvents);
        persistRenderedEventsForTurn(
          result.data.turn_id ?? `auto-${sourceUserMessageId}`,
          preparedEvents,
        );
      }, delayMs * pacingMultiplier);
    },
    [
      chatMode,
      lowCostMode,
      pacingMultiplier,
      persistRenderedEventsForTurn,
      prepareEvents,
      scheduleEvents,
      scheduleTurnTimer,
      sendChatPayload,
      updateWaiting,
    ],
  );

  const submitUserMessage = useCallback(
    async (userMsg: ChatMessage, append: boolean) => {
      if (isWaitingRef.current) return;
      updateWaiting(true);
      // User taking action — dismiss the resumed-session pill immediately.
      setShowResumedPill(false);
      if (append) {
        setMessages((prev) => [...prev, userMsg]);
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? userMsg : m)),
        );
      }
      const result = await sendChatPayload(userMsg);

      if (!result.ok) {
        console.warn(
          `[chat] send failed status=${result.status} message=${result.message}`,
        );
        const deliveryError =
          result.status === 402 && result.cooldownSeconds
            ? `Message limit reached. Try again in ${Math.ceil(
                result.cooldownSeconds / 60,
              )} min.`
            : result.status === 429 && result.reason === "hourly_quota"
              ? "Hourly message limit reached. Try again after the cooldown."
              : result.status === 429
                ? result.message
                : result.status === 0
                  ? "No connection. Your message is saved here — retry when you're back online."
              : `${result.message} (HTTP ${result.status})`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id
              ? {
                  ...m,
                  deliveryStatus: "failed",
                  deliveryError,
                }
              : m,
          ),
        );
        if (
          (result.status === 402 ||
            (result.status === 429 &&
              (result.reason === "hourly_quota" ||
                result.reason === "rapid_requests"))) &&
          result.cooldownSeconds
        ) {
          setCooldownUntil(Date.now() + result.cooldownSeconds * 1000);
        }
        if (result.status >= 500 || result.status === 0) {
          autonomousBackoffUntilRef.current = Date.now() + 30_000;
        }
        if (result.status === 0) setConfirmedOffline(true);
        if (result.status === 402 && result.cooldownSeconds) {
          Alert.alert(
            "Message limit reached",
            `Try again in ${Math.ceil(result.cooldownSeconds / 60)} min, or upgrade for more messages.`
          );
        } else if (
          result.status === 429 &&
          result.reason === "hourly_quota"
        ) {
          const limitedTier = getTierFromProfile(result.tier ?? tier);
          Alert.alert(
            "Message limit reached",
            limitedTier === "basic"
              ? "Basic includes 40 messages per hour. You can wait for the cooldown or upgrade to Pro for unlimited messages."
              : "Free includes 25 messages per hour. You can wait for the cooldown or upgrade for more.",
          );
        } else if (result.status === 429) {
          Alert.alert("Slow down a sec", result.message);
        } else if (result.status !== 0) {
          Alert.alert("Send failed", `${result.message} (HTTP ${result.status})`);
        }
        updateWaiting(false);
        return;
      }

      if (result.data.paywall) {
        const cooldownSeconds = result.data.cooldown_seconds ?? 300;
        setCooldownUntil(Date.now() + cooldownSeconds * 1000);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id
              ? {
                  ...m,
                  deliveryStatus: "failed",
                  deliveryError: "Message limit reached.",
                }
              : m,
          ),
        );
        Alert.alert(
          "Message limit reached",
          "You can wait for the cooldown or open plans when you are ready.",
        );
        updateWaiting(false);
        return;
      }

      if (typeof result.data.messages_remaining === "number") {
        setMessagesRemaining(result.data.messages_remaining);
      }
      setConfirmedOffline(false);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id
            ? { ...m, deliveryStatus: "sent", deliveryError: undefined }
            : m,
        ),
      );

      // If the server returns ok but with zero events, the gang isn't actually
      // going to respond — surface this so the user isn't waiting on nothing.
      if (!result.data.events || result.data.events.length === 0) {
        console.warn("[chat] server returned 0 events — no AI reply scheduled");
        Alert.alert(
          "Your gang's quiet",
          "The server accepted your message but didn't generate a reply. Try again in a moment.",
        );
        updateWaiting(false);
        return;
      }

      const preparedEvents = prepareEvents(result.data.events);
      const shouldAutonomousFollowUp =
        chatMode === "ecosystem" &&
        !lowCostMode &&
        hasOpenFloorIntent(userMsg.content) &&
        Date.now() >= autonomousBackoffUntilRef.current;
      scheduleEvents(preparedEvents, () => {
        if (shouldAutonomousFollowUp) {
          scheduleAutonomousTurn(userMsg.id, false, 1200);
        } else {
          scheduleAutonomousTurn(userMsg.id, true, 10_000);
        }
      });

      // Persist AI-rendered events to chat_history so they survive app reloads.
      // /api/chat only persists the user's message — AI events are ephemeral
      // until we POST them back via /api/chat/rendered. Web does this; mobile
      // wasn't, which caused AI replies to vanish on every app restart.
      // Fire-and-forget: failures are logged in postRenderedEvents but don't
      // block the chat UX (the local AsyncStorage cache still holds the messages
      // for this session — only cross-session restoration was broken).
      persistRenderedEventsForTurn(result.data.turn_id ?? userMsg.id, preparedEvents);
    },
    [
      chatMode,
      lowCostMode,
      persistRenderedEventsForTurn,
      prepareEvents,
      scheduleAutonomousTurn,
      scheduleEvents,
      sendChatPayload,
      tier,
      updateWaiting,
    ]
  );

  const handleSend = useCallback(
    (text: string) => {
      if (cooldownLabel) return;
      clearTurnTimers();
      const userMsg: ChatMessage = {
        id: generateMessageId(),
        speaker: "user",
        content: text,
        created_at: new Date().toISOString(),
        source: "chat",
        deliveryStatus: "sending",
        ...(replyTarget ? { replyToId: replyTarget.id } : {}),
      };
      lastUserMessageIdRef.current = userMsg.id;
      currentUserMessageContentRef.current = text;
      idleAutoCountRef.current = 0;
      setReplyTarget(null);
      void submitUserMessage(userMsg, true);
    },
    [clearTurnTimers, cooldownLabel, replyTarget, submitUserMessage],
  );

  const handleRetryMessage = useCallback(
    (message: ChatMessage) => {
      if (isWaitingRef.current || cooldownLabel) return;
      clearTurnTimers();
      lastUserMessageIdRef.current = message.id;
      currentUserMessageContentRef.current = message.content;
      void submitUserMessage(
        {
          ...message,
          deliveryStatus: "sending",
          deliveryError: undefined,
          source: message.source ?? "chat",
        },
        false,
      );
    },
    [clearTurnTimers, cooldownLabel, submitUserMessage],
  );

  const handleCopy = useCallback(async (msg: ChatMessage) => {
    await Clipboard.setStringAsync(msg.content);
  }, []);

  const getSpeakerName = useCallback(
    (speaker: string) => {
      if (speaker === "user") return profile?.username ?? "You";
      return (
        effectiveCustomNames?.[speaker] ??
        allCharacters.find((c) => c.id === speaker)?.name ??
        speaker
      );
    },
    [allCharacters, effectiveCustomNames, profile?.username],
  );

  const handleShareMessage = useCallback(
    async (msg: ChatMessage) => {
      await Share.share({
        title: "MyGang chat",
        message: `${getSpeakerName(msg.speaker)}: ${msg.content}`,
      });
    },
    [getSpeakerName],
  );

  const handleShareTranscript = useCallback(async () => {
    const shareable = messagesRef.current
      .filter((m) => m.source !== "system")
      .slice(-40)
      .map((m) => `${getSpeakerName(m.speaker)}: ${m.content}`)
      .join("\n\n");

    if (!shareable.trim()) {
      Alert.alert("Nothing to share yet", "Send a few messages first.");
      return;
    }

    await Share.share({
      title: "MyGang chat",
      message: `MyGang chat\n\n${shareable}`,
    });
  }, [getSpeakerName]);

  const handleReact = useCallback(
    async (msg: ChatMessage, emoji: string) => {
      const previousReaction = msg.reaction ?? "";
      // Update the local message with the reaction
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, reaction: emoji } : m))
      );
      if (!user?.id) return;
      const { error } = await supabase
        .from("chat_history")
        .update({ reaction: emoji || null } as never)
        .eq("user_id", user.id)
        .eq("client_message_id", msg.id);
      if (error) {
        console.warn("[chat] could not persist reaction:", error.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? { ...m, reaction: previousReaction || undefined }
              : m,
          ),
        );
        Alert.alert(
          "Reaction not saved",
          "Your connection changed before the reaction could be saved. Try again.",
        );
      }
    },
    [user?.id]
  );

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openMemoryVault = useCallback(() => setMemoryVaultOpen(true), []);
  const closeMemoryVault = useCallback(() => setMemoryVaultOpen(false), []);
  const dismissPurchaseCelebration = useCallback(
    () => setCelebrationPlan(null),
    [],
  );
  const handleAvatarPress = useCallback(
    (c: CharacterCatalogEntry) => setLightboxCharacter(c),
    [],
  );
  const handleRefreshHistory = useCallback(async () => {
    if (!user?.id) return;
    const page = await fetchChatHistoryPage(user.id);
    if (page.error) {
      setHistoryError(page.error);
      return;
    }
    setHistoryError(null);
    setHasOlderMessages(page.hasMore);
    setHistoryCursor(page.nextBefore);
    if (page.messages.length > 0) setMessages(page.messages);
  }, [user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && !isWaitingRef.current && !isOffline) {
        void handleRefreshHistory();
      }
    });
    return () => subscription.remove();
  }, [handleRefreshHistory, isOffline]);

  const handleLoadOlderHistory = useCallback(async () => {
    if (!user?.id || !historyCursor || loadingOlder) return;
    setLoadingOlder(true);
    const page = await fetchChatHistoryPage(user.id, historyCursor);
    setLoadingOlder(false);
    if (page.error) {
      setHistoryError(page.error);
      return;
    }
    setHistoryError(null);
    setHasOlderMessages(page.hasMore);
    setHistoryCursor(page.nextBefore);
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      return [
        ...page.messages.filter((m) => !existingIds.has(m.id)),
        ...prev,
      ];
    });
  }, [historyCursor, loadingOlder, user?.id]);

  const openSettingsEdgeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-999, -18])
        .failOffsetY([-24, 24])
        .onEnd((event) => {
          if (event.translationX < -36) {
            runOnJS(openSettings)();
          }
        }),
    [openSettings],
  );

  // Stable handlers for MessageList — inline arrows would force renderItem to
  // recreate every parent re-render, which thrashes FlatList visible-window updates.
  const handleMessageLongPress = useCallback(
    (m: ChatMessage) => setActionMessage(m),
    [],
  );
  const handleReplyPress = useCallback(
    (m: ChatMessage) => setReplyTarget(m),
    [],
  );
  const handleReactPress = useCallback(
    (m: ChatMessage, emoji: string) => {
      void handleReact(m, emoji);
    },
    [handleReact],
  );

  const replyChipProps = replyTarget
    ? {
        speaker: replyTarget.speaker,
        content: replyTarget.content,
        speakerName:
          replyTarget.speaker === "user"
            ? "yourself"
            : effectiveCustomNames?.[replyTarget.speaker] ??
              allCharacters.find((c) => c.id === replyTarget.speaker)?.name ??
              replyTarget.speaker,
        speakerColor:
          replyTarget.speaker === "user"
            ? "#3eddc0"
            : allCharacters.find((c) => c.id === replyTarget.speaker)?.color ??
              "#a1a1aa",
      }
    : null;

  // If we somehow got here without a gang, show a helpful state instead of an empty chat.
  if (gang.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ChatHeader
          characters={[]}
          avatarStyle={avatarStyle}
          onOpenSettings={openSettings}
          onOpenMemoryVault={openMemoryVault}
          isTyping={typingCharacterId !== null}
        />
        <EmptyState
          gang={[]}
          avatarStyle={avatarStyle}
          username={profile?.username ?? null}
          actionLabel="Choose gang"
          onActionPress={() => router.push("/(app)/edit-gang")}
        />
        {settingsOpen ? (
          <SettingsDrawer
            visible
            onClose={closeSettings}
            ecosystemSpeed={ecosystemSpeed}
            onEcosystemSpeedChange={updateEcosystemSpeed}
          />
        ) : null}
        {memoryVaultOpen ? (
          <MemoryVaultDrawer
            visible
            onClose={closeMemoryVault}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <WallpaperBackground wallpaper={wallpaper}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior="translate-with-padding"
        >
          <ChatHeader
            characters={gang}
            avatarStyle={avatarStyle}
            onAvatarPress={handleAvatarPress}
            onOpenSettings={openSettings}
            onOpenMemoryVault={openMemoryVault}
            isTyping={typingCharacterId !== null}
            onRefresh={handleRefreshHistory}
            onShareTranscript={handleShareTranscript}
          />
        <View className="flex-1">
          {(cooldownLabel || (messagesRemaining !== null && messagesRemaining <= 10)) ? (
            <Pressable
              onPress={() => router.push("/(app)/pricing")}
              className="mx-3 mt-3 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 active:bg-primary/15"
              accessibilityRole="button"
              accessibilityLabel="Open plans"
            >
              <Text className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {cooldownLabel ? "Cooldown active" : "Messages running low"}
              </Text>
              <Text className="mt-1 text-sm text-foreground">
                {cooldownLabel
                  ? `${cooldownLabel}. Tap to see plans.`
                  : `${messagesRemaining} message${
                      messagesRemaining === 1 ? "" : "s"
                    } left this window. Tap to see plans.`}
              </Text>
            </Pressable>
          ) : null}
          {isOffline ? (
            <View
              className="mx-3 mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2"
              accessibilityRole="alert"
            >
              <Text className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
                {"You're offline"}
              </Text>
              <Text className="mt-1 text-sm text-foreground">
                {"Keep typing—your draft is saved. Send will return when you're connected."}
              </Text>
            </View>
          ) : null}
          {showResumedPill && messages.length > 0 ? (
            <View className="self-center mt-3 mb-1 rounded-full border border-border bg-card-translucent px-3 py-1.5">
              <Text className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                RESUMED YOUR LAST SESSION
              </Text>
            </View>
          ) : null}
          {messages.length === 0 && hasHydrated ? (
            <EmptyState
              gang={gang}
              avatarStyle={avatarStyle}
              username={profile?.username ?? null}
            />
          ) : (
            <MessageList
              messages={messages}
              characters={allCharacters}
              customNames={
                effectiveCustomNames
              }
              avatarStyle={avatarStyle}
              onMessageLongPress={handleMessageLongPress}
              onReactPress={handleReactPress}
              onReplyPress={handleReplyPress}
              onRetryPress={handleRetryMessage}
              hasOlderMessages={hasOlderMessages}
              isLoadingOlder={loadingOlder}
              historyError={historyError}
              onLoadOlder={handleLoadOlderHistory}
              onRetryHistory={handleRefreshHistory}
            />
          )}
          {typingCharacterId
            ? (() => {
                const c = allCharacters.find((x) => x.id === typingCharacterId);
                if (!c) return null;
                const customName =
                  (profile?.custom_character_names as Record<string, string> | null)
                    ?.[typingCharacterId] ?? undefined;
                return (
                  <TypingIndicator
                    character={c}
                    customName={customName}
                    avatarStyle={avatarStyle}
                  />
                );
              })()
            : null}
        </View>
        {/* Bottom area gets its own SafeAreaView with edges=["bottom"] so the
            input + disclaimer sit ABOVE the Android nav bar in edge-to-edge
            mode. The outer SafeAreaView intentionally excludes "bottom" so
            the wallpaper still draws under the nav bar — this nested one
            applies the system inset only to the input wrapper. */}
        <SafeAreaView edges={["bottom"]}>
          <ChatInput
            onSend={handleSend}
            isSending={isWaiting}
            sendBlocked={Boolean(cooldownLabel) || isOffline}
            replyTarget={replyChipProps}
            onCancelReply={() => setReplyTarget(null)}
            cooldownPlaceholder={
              isOffline ? "Offline — draft saved" : cooldownLabel
            }
            blockedNotice={
              isOffline
                ? "You're offline. Your draft is saved."
                : cooldownLabel
                  ? `${cooldownLabel}. Try again when it ends.`
                  : null
            }
            draftUserId={user?.id ?? null}
          />
          <AiDisclaimer />
        </SafeAreaView>
        {!settingsOpen && !memoryVaultOpen ? (
          <GestureDetector gesture={openSettingsEdgeGesture}>
            <View
              className="absolute right-0 w-8"
              style={{ top: 58, bottom: 112 }}
              pointerEvents="box-only"
            />
          </GestureDetector>
        ) : null}
        </KeyboardAvoidingView>
      </WallpaperBackground>

      <PurchaseCelebration
        plan={celebrationPlan}
        onComplete={dismissPurchaseCelebration}
      />

      <MessageActionsSheet
        visible={actionMessage !== null}
        onClose={() => setActionMessage(null)}
        onCopy={() => {
          if (actionMessage) void handleCopy(actionMessage);
        }}
        onShare={() => {
          if (actionMessage) void handleShareMessage(actionMessage);
        }}
        onReact={(emoji) => {
          if (actionMessage) void handleReact(actionMessage, emoji);
        }}
        canReact={actionMessage !== null && actionMessage.speaker !== "user"}
        onReply={() => {
          if (actionMessage) setReplyTarget(actionMessage);
        }}
      />

      <AvatarLightbox
        character={lightboxCharacter}
        customName={
          lightboxCharacter
            ? effectiveCustomNames?.[lightboxCharacter.id] ?? null
            : null
        }
        avatarStyle={avatarStyle}
        onClose={() => setLightboxCharacter(null)}
      />

      {settingsOpen ? (
          <SettingsDrawer
            visible
            onClose={closeSettings}
            ecosystemSpeed={ecosystemSpeed}
            onEcosystemSpeedChange={updateEcosystemSpeed}
          />
      ) : null}

      {memoryVaultOpen ? (
          <MemoryVaultDrawer
            visible
            onClose={closeMemoryVault}
          />
      ) : null}
    </SafeAreaView>
  );
}
