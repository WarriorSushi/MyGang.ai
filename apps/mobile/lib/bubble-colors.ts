/**
 * Per-character message bubble color computation.
 * Mirrors the dark-mode logic in apps/web/src/components/chat/message-item.tsx:
 *   - bubble bg: 15% of character color blended into a dark base (#161e2e)
 *   - persona name: 80% of character color (slightly desaturated toward white)
 */

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string | undefined): Rgb {
  if (!hex) return { r: 80, g: 80, b: 80 };
  const cleaned = hex.replace("#", "");
  if (cleaned.length === 3) {
    return {
      r: parseInt(cleaned[0] + cleaned[0], 16),
      g: parseInt(cleaned[1] + cleaned[1], 16),
      b: parseInt(cleaned[2] + cleaned[2], 16),
    };
  }
  if (cleaned.length === 6) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  }
  return { r: 80, g: 80, b: 80 };
}

function mix(a: Rgb, b: Rgb, weight: number): Rgb {
  const w = Math.max(0, Math.min(1, weight));
  return {
    r: Math.round(a.r * (1 - w) + b.r * w),
    g: Math.round(a.g * (1 - w) + b.g * w),
    b: Math.round(a.b * (1 - w) + b.b * w),
  };
}

function rgbToCss(c: Rgb): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

const DARK_BASE: Rgb = { r: 22, g: 30, b: 46 }; // #161e2e — matches web's mix base
const LIGHT_BASE: Rgb = { r: 255, g: 255, b: 255 };

/** Returns the bubble background color for a character. */
export function bubbleBgForCharacter(
  characterColor: string | undefined,
  scheme: "light" | "dark" = "dark",
): string {
  const base = parseHex(characterColor);
  const mixed =
    scheme === "light"
      ? mix(base, LIGHT_BASE, 0.88)
      : mix(base, DARK_BASE, 0.85);
  return rgbToCss(mixed);
}

/** Returns the persona-name text color for a character. */
export function personaNameColor(
  characterColor: string | undefined,
  scheme: "light" | "dark" = "dark",
): string {
  const base = parseHex(characterColor);
  const mixed =
    scheme === "light"
      ? mix(base, { r: 0, g: 0, b: 0 }, 0.28)
      : mix(base, { r: 255, g: 255, b: 255 }, 0.2);
  return rgbToCss(mixed);
}
