import { describe, expect, it } from "vitest";

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

