import AsyncStorage from "@react-native-async-storage/async-storage";
import { type ChatMessage } from "../components/chat/message-item";

const MAX_PERSISTED_MESSAGES = 100;

function keyForUser(userId: string): string {
  return `mygang:chat:messages:${userId}`;
}

export async function loadPersistedMessages(
  userId: string
): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(keyForUser(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is ChatMessage =>
          typeof m === "object" &&
          m !== null &&
          typeof m.id === "string" &&
          typeof m.speaker === "string" &&
          typeof m.content === "string" &&
          typeof m.created_at === "string"
      )
      .slice(-MAX_PERSISTED_MESSAGES);
  } catch {
    return [];
  }
}

export async function savePersistedMessages(
  userId: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    const trimmed = messages.slice(-MAX_PERSISTED_MESSAGES);
    await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(trimmed));
  } catch {
    // Persistence failures are non-fatal; messages stay in memory.
  }
}

export async function clearPersistedMessages(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyForUser(userId));
  } catch {
    // ignore
  }
}
