import { apiUrl } from "./config";
import { supabase } from "./supabase";

type MemoryMutationResult =
  | { ok: true; content?: string }
  | { ok: false; error: string; status: number };

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function updateMemoryApi(
  id: string,
  content: string,
): Promise<MemoryMutationResult> {
  const headers = await authHeaders();
  if (!headers) return { ok: false, status: 401, error: "Not signed in." };

  const res = await fetch(apiUrl(`memories/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers,
    body: JSON.stringify({ content }),
  }).catch((err) => err as Error);

  if (res instanceof Error) {
    return { ok: false, status: 0, error: res.message };
  }

  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    content?: string;
  };
  if (!res.ok || body.ok === false) {
    return {
      ok: false,
      status: res.status,
      error: body.error ?? `HTTP ${res.status}`,
    };
  }

  return { ok: true, content: body.content };
}

export async function deleteMemoryApi(
  id: string,
): Promise<MemoryMutationResult> {
  const headers = await authHeaders();
  if (!headers) return { ok: false, status: 401, error: "Not signed in." };

  const res = await fetch(apiUrl(`memories/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers,
  }).catch((err) => err as Error);

  if (res instanceof Error) {
    return { ok: false, status: 0, error: res.message };
  }

  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || body.ok === false) {
    return {
      ok: false,
      status: res.status,
      error: body.error ?? `HTTP ${res.status}`,
    };
  }

  return { ok: true };
}
