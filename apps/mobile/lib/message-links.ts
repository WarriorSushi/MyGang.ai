export type MessagePart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; url: string };

const URL_PATTERN = /https?:\/\/[^\s<>{}\[\]]+/gi;
const TRAILING_PUNCTUATION = /[.,!?;:)}\]]+$/;

export function splitMessageLinks(content: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let cursor = 0;

  for (const match of content.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const trailing = raw.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const link = trailing ? raw.slice(0, -trailing.length) : raw;

    if (index > cursor) {
      parts.push({ type: "text", value: content.slice(cursor, index) });
    }
    if (link) {
      parts.push({ type: "link", value: link, url: link });
    }
    if (trailing) {
      parts.push({ type: "text", value: trailing });
    }
    cursor = index + raw.length;
  }

  if (cursor < content.length) {
    parts.push({ type: "text", value: content.slice(cursor) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: content }];
}

