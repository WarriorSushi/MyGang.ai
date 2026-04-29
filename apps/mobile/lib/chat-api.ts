import { supabase } from "./supabase";

const CHAT_API_URL = "https://mygang.ai/api/chat";

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
};

export type ChatResponse = {
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
  | { ok: false; status: number; message: string; cooldownSeconds?: number };

export async function postChat(payload: ChatRequest): Promise<ChatApiResult> {
  // Get the user's current Supabase access token to authorize the call.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return { ok: false, status: 401, message: "Not signed in." };
  }

  let response: Response;
  try {
    response = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return {
      ok: false,
      status: response.status,
      message: `Server returned non-JSON (HTTP ${response.status})`,
    };
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
    return { ok: false, status: response.status, message, cooldownSeconds: cooldown };
  }

  return { ok: true, data: data as ChatResponse };
}

/** Generate a stable client-side message ID. */
export function generateMessageId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
