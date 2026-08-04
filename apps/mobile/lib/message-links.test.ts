import { describe, expect, it } from "vitest";
import { getMessageBubbleMaxWidth } from "./message-layout";

import { splitMessageLinks } from "./message-links";

describe("splitMessageLinks", () => {
  it("preserves plain text", () => {
    expect(splitMessageLinks("no links here")).toEqual([
      { type: "text", value: "no links here" },
    ]);
  });

  it("makes http and https URLs tappable without swallowing punctuation", () => {
    expect(
      splitMessageLinks("Try https://mygang.ai/pricing, or http://example.com!"),
    ).toEqual([
      { type: "text", value: "Try " },
      {
        type: "link",
        value: "https://mygang.ai/pricing",
        url: "https://mygang.ai/pricing",
      },
      { type: "text", value: "," },
      { type: "text", value: " or " },
      {
        type: "link",
        value: "http://example.com",
        url: "http://example.com",
      },
      { type: "text", value: "!" },
    ]);
  });
});

describe("getMessageBubbleMaxWidth", () => {
  it("keeps bubbles inside narrow phone viewports", () => {
    expect(getMessageBubbleMaxWidth(320, true)).toBe(256);
    expect(getMessageBubbleMaxWidth(320, false)).toBeCloseTo(249.6);
    expect(getMessageBubbleMaxWidth(411, true)).toBeCloseTo(328.8);
    expect(getMessageBubbleMaxWidth(411, false)).toBeCloseTo(320.58);
  });

  it("retains the desktop and tablet ceiling", () => {
    expect(getMessageBubbleMaxWidth(1024, true)).toBe(560);
    expect(getMessageBubbleMaxWidth(1024, false)).toBe(560);
  });
});
