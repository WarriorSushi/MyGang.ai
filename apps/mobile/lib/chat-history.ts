import { supabase } from "./supabase";
import { type ChatMessage } from "../components/chat/message-item";

const HISTORY_LIMIT = 50;

type ChatHistoryRow = {
  id: string;
  client_message_id: string | null;
  content: string;
  created_at: string;
  reaction: string | null;
  speaker: string;
  source: string;
};

/**
 * Fetch the user's most-recent chat history from Supabase, oldest-first.
 * Filters out 'wywa' and 'system' source rows so the chat list shows only
 * normal conversation messages.
 */
export async function fetchRecentChatHistory(
  userId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_history")
    .select("id, client_message_id, content, created_at, reaction, speaker, source")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) {
    return [];
  }

  const rows = (data ?? []) as ChatHistoryRow[];
  // Reverse for chronological order (oldest first), keep only chat source
  return rows
    .filter((r) => !r.source || r.source === "chat")
    .reverse()
    .map((row) => ({
      id: row.client_message_id ?? row.id,
      speaker: row.speaker,
      content: row.content,
      created_at: row.created_at,
      reaction: row.reaction ?? undefined,
    }));
}
