import { supabase } from "./supabase";
import { type ChatMessage } from "../components/chat/message-item";

const HISTORY_PAGE_SIZE = 50;
const HISTORY_TIMEOUT_MS = 12_000;

type ChatHistoryRow = {
  id: string;
  client_message_id: string | null;
  content: string;
  created_at: string;
  reaction: string | null;
  reply_to_client_message_id: string | null;
  speaker: string;
  source: string;
};

export type ChatHistoryPage = {
  messages: ChatMessage[];
  hasMore: boolean;
  nextBefore: string | null;
  error?: string;
};

/**
 * Fetch one page of the user's chat history from Supabase, oldest-first.
 * Keeps WYWA rows so mobile matches the web app's resumed-chat behavior.
 */
export async function fetchChatHistoryPage(
  userId: string,
  before?: string | null,
): Promise<ChatHistoryPage> {
  let query = supabase
    .from("chat_history")
    .select(
      "id, client_message_id, content, created_at, reaction, reply_to_client_message_id, speaker, source",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_PAGE_SIZE + 1);

  if (before) {
    query = query.lt("created_at", before);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HISTORY_TIMEOUT_MS);
  let data: unknown[] | null;
  let error: { message: string } | null;
  try {
    const result = await query.abortSignal(controller.signal);
    data = result.data as unknown[] | null;
    error = result.error;
  } catch (err) {
    return {
      messages: [],
      hasMore: false,
      nextBefore: null,
      error:
        err instanceof Error && err.name === "AbortError"
          ? "Chat history took too long to load."
          : "Chat history could not be loaded.",
    };
  } finally {
    clearTimeout(timeout);
  }

  if (error) {
    return {
      messages: [],
      hasMore: false,
      nextBefore: null,
      error: error.message,
    };
  }

  const rows = (data ?? []) as ChatHistoryRow[];
  const visibleRows = rows
    .filter((r) => r.source !== "system")
    .slice(0, HISTORY_PAGE_SIZE);
  const oldest = visibleRows[visibleRows.length - 1] ?? null;

  return {
    hasMore: rows.length > HISTORY_PAGE_SIZE,
    nextBefore: oldest?.created_at ?? null,
    messages: visibleRows
      .reverse()
      .map((row) => ({
        id: row.client_message_id ?? row.id,
        speaker: row.speaker,
        content: row.content,
        created_at: row.created_at,
        reaction: row.reaction ?? undefined,
        replyToId: row.reply_to_client_message_id ?? undefined,
        source:
          row.source === "wywa" || row.source === "system"
            ? row.source
            : "chat",
      })),
  };
}

export async function fetchRecentChatHistory(
  userId: string,
): Promise<ChatMessage[]> {
  const page = await fetchChatHistoryPage(userId);
  return page.messages;
}
