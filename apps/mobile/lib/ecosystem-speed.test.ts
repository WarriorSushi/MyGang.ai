import { describe, expect, it } from "vitest";

import {
  getEcosystemPacingMultiplier,
  isEcosystemSpeed,
} from "./ecosystem-speed";

describe("ecosystem pacing", () => {
  it("matches the web pacing multipliers", () => {
    expect(getEcosystemPacingMultiplier("fast")).toBe(0.5);
    expect(getEcosystemPacingMultiplier("normal")).toBe(1);
    expect(getEcosystemPacingMultiplier("relaxed")).toBe(2);
  });

  it("rejects stale or corrupt stored values", () => {
    expect(isEcosystemSpeed("fast")).toBe(true);
    expect(isEcosystemSpeed("slow")).toBe(false);
    expect(isEcosystemSpeed(null)).toBe(false);
  });
});

