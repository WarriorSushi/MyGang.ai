import { supabase } from "./supabase";
import { apiUrl } from "./config";

const CHAT_API_URL = apiUrl("chat");
const CHAT_RENDERED_URL = apiUrl("chat/rendered");
const CHAT_REQUEST_TIMEOUT_MS = 35_000;
const CHAT_EVENT_TYPES = new Set<ChatEvent["type"]>([
  "message",
  "reaction",
  "status_update",
  "nickname_update",
  "typing_ghost",
]);

export type ChatEvent = {
  type: "message" | "reaction" | "status_update" | "nickname_update" | "typing_ghost";
  character: string;
  message_id?: string;
  content?: string;
  target_message_id?: string;
  delay: number;
};

export type ChatRequestMessage = {
  id: string;
  speaker: string; // 'user' or character ID
  content: string;
  created_at: string;
  reaction?: string;
  replyToId?: string;
  source?: "chat" | "wywa" | "system";
};

export type ChatRequest = {
  messages: ChatRequestMessage[];
  activeGangIds?: string[];
  userName?: string | null;
  userNickname?: string | null;
  silentTurns?: number;
  chatMode?: "gang_focus" | "ecosystem";
  lowCostMode?: boolean;
  source?: "user" | "autonomous" | "autonomous_idle";
  autonomousIdle?: boolean;
};

export type ChatResponse = {
  turn_id?: string;
  events: ChatEvent[];
  responders?: string[];
  should_continue?: boolean;
  paywall?: boolean;
  cooldown_seconds?: number;
  tier?: string;
  messages_remaining?: number;
};

export type ChatApiResult =
  | { ok: true; data: ChatResponse }
  | {
      ok: false;
      status: number;
      message: string;
      cooldownSeconds?: number;
      tier?: string;
      paywall?: boolean;
      reason?: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isChatEvent(value: unknown): value is ChatEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.type === "string" &&
    CHAT_EVENT_TYPES.has(value.type as ChatEvent["type"]) &&
    typeof value.character === "string" &&
    typeof value.delay === "number" &&
    Number.isFinite(value.delay) &&
    (value.content === undefined || typeof value.content === "string") &&
    (value.message_id === undefined || typeof value.message_id === "string") &&
    (value.target_message_id === undefined ||
      typeof value.target_message_id === "string")
  );
}

export async function postChat(payload: ChatRequest): Promise<ChatApiResult> {
  let accessToken: string | undefined;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    accessToken = sessionData.session?.access_token;
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Could not read your session. Please try again.",
    };
  }

  if (!accessToken) {
    return { ok: false, status: 401, message: "Not signed in." };
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: 0,
      message: timedOut
        ? "Reply took too long. Check your connection and try again."
        : err instanceof Error
          ? err.message
          : "Network error",
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: timedOut ? 0 : response.status,
      message: timedOut
        ? "Reply took too long. Check your connection and try again."
        : `Server returned non-JSON (HTTP ${response.status})`,
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const obj = (data ?? {}) as Record<string, unknown>;
    const message =
      (typeof obj.error === "string" && obj.error) ||
      (typeof obj.message === "string" && obj.message) ||
      `HTTP ${response.status}`;
    const cooldown =
      typeof obj.cooldown_seconds === "number"
        ? obj.cooldown_seconds
        : undefined;
    const tier = typeof obj.tier === "string" ? obj.tier : undefined;
    const paywall = obj.paywall === true;
    const reason = typeof obj.reason === "string" ? obj.reason : undefined;
    return {
      ok: false,
      status: response.status,
      message,
      cooldownSeconds: cooldown,
      tier,
      paywall,
      reason,
    };
  }

  if (!isRecord(data) || !Array.isArray(data.events) || !data.events.every(isChatEvent)) {
    return {
      ok: false,
      status: 502,
      message: "The server returned an invalid chat response. Please retry.",
    };
  }

  return { ok: true, data: data as ChatResponse };
}

/** Generate a stable client-side message ID. */
export function generateMessageId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type RenderedEvent = {
  message_id: string;
  speaker: string;
  content: string;
  displayed_at: string; // ISO timestamp
  reaction?: string;
  reply_to_message_id?: string;
};

/**
 * Persist AI-rendered chat events to chat_history (server-side).
 *
 * /api/chat persists ONLY the user's message to chat_history. The AI events
 * it returns are ephemeral — until the client posts them back via
 * /api/chat/rendered, the server has no record of them. Without this call,
 * AI replies vanish on app reload (the chat_history fetch only returns the
 * user's messages and overwrites the local cache).
 *
 * Web does this automatically; mobile must too. Fire-and-forget — failures
 * are logged but don't block the chat surface.
 */
export async function postRenderedEvents(args: {
  userId?: string;
  turnId: string;
  events: RenderedEvent[];
}): Promise<boolean> {
  if (args.events.length === 0) return true;

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return false;

  try {
    const res = await fetch(CHAT_RENDERED_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        turn_id: args.turnId,
        events: args.events,
      }),
    });
    if (!res.ok) {
      console.warn(
        `[chat] postRenderedEvents failed: HTTP ${res.status}`,
        await res.text().catch(() => ""),
      );
      return persistRenderedEventsDirectly(args.userId, args.events);
    }
    return true;
  } catch (err) {
    console.warn("[chat] postRenderedEvents threw:", err);
    return persistRenderedEventsDirectly(args.userId, args.events);
  }
}

async function persistRenderedEventsDirectly(
  userId: string | undefined,
  events: RenderedEvent[],
): Promise<boolean> {
  if (!userId || events.length === 0) return false;

  const { data: gang, error: gangError } = await supabase
    .from("gangs")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (gangError || !gang?.id) {
    console.warn("[chat] direct rendered-event gang upsert failed:", gangError);
    return false;
  }

  const candidateIds = events.map((event) => event.message_id);
  const { data: existing, error: existingError } = await supabase
    .from("chat_history")
    .select("client_message_id")
    .eq("user_id", userId)
    .eq("gang_id", gang.id)
    .in("client_message_id", candidateIds);

  if (existingError) {
    console.warn("[chat] direct rendered-event duplicate check failed:", existingError);
    return false;
  }

  const existingIds = new Set(
    ((existing ?? []) as { client_message_id: string | null }[])
      .map((row) => row.client_message_id)
      .filter(Boolean),
  );

  const rows = events
    .filter((event) => !existingIds.has(event.message_id))
    .map((event) => ({
      user_id: userId,
      gang_id: gang.id,
      speaker: event.speaker,
      content: event.content.trim().slice(0, 700),
      created_at: event.displayed_at,
      client_message_id: event.message_id,
      reply_to_client_message_id: event.reply_to_message_id ?? null,
      reaction: event.reaction ?? null,
      source: "chat",
    }));

  if (rows.length === 0) return true;

  const { error } = await supabase.from("chat_history").insert(rows);
  if (error) {
    console.warn("[chat] direct rendered-event insert failed:", error);
    return false;
  }

  return true;
}
