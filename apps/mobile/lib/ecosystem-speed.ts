export const ECOSYSTEM_SPEEDS = ["fast", "normal", "relaxed"] as const;

export type EcosystemSpeed = (typeof ECOSYSTEM_SPEEDS)[number];

export function isEcosystemSpeed(value: unknown): value is EcosystemSpeed {
  return (
    typeof value === "string" &&
    (ECOSYSTEM_SPEEDS as readonly string[]).includes(value)
  );
}

export function getEcosystemPacingMultiplier(
  speed: EcosystemSpeed,
): number {
  if (speed === "fast") return 0.5;
  if (speed === "relaxed") return 2;
  return 1;
}

