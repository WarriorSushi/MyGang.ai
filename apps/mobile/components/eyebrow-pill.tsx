import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

type EyebrowPillProps = {
  label: string;
  icon?: LucideIcon;
  tint?: "teal" | "amber" | "magenta" | "sky";
};

const TINT_BG: Record<NonNullable<EyebrowPillProps["tint"]>, string> = {
  teal: "rgba(62,221,192,0.12)",
  amber: "rgba(245,158,11,0.15)",
  magenta: "rgba(213,109,181,0.14)",
  sky: "rgba(125,211,252,0.14)",
};

const TINT_TEXT: Record<NonNullable<EyebrowPillProps["tint"]>, string> = {
  teal: "#5eead4",
  amber: "#fbbf24",
  magenta: "#f0abfc",
  sky: "#7dd3fc",
};

export function EyebrowPill({ label, icon: Icon, tint = "teal" }: EyebrowPillProps) {
  return (
    <View
      style={{ backgroundColor: TINT_BG[tint] }}
      className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1"
    >
      {Icon ? <Icon size={12} color={TINT_TEXT[tint]} strokeWidth={2.4} /> : null}
      <Text
        style={{ color: TINT_TEXT[tint] }}
        className="text-[10px] font-semibold uppercase tracking-[0.18em]"
      >
        {label}
      </Text>
    </View>
  );
}
