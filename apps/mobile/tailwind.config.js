/**
 * NativeWind config for the MyGang mobile app.
 *
 * Color palette mirrors apps/web/src/app/globals.css `.dark` theme tokens
 * (the web app is dark-only in practice). OKLCH source values converted
 * to approximate hex:
 *   --background      oklch(0.18 0.01 255) → #161924   (dark slate-blue, NOT pure black)
 *   --foreground      oklch(0.96 0.01 255) → #f3f5f9   (near-white)
 *   --card            oklch(0.24 0.015 255 / 0.82) → #23272f at 82% alpha
 *   --primary         oklch(0.72 0.16 170) → #3eddc0   (TEAL — brand color)
 *   --primary-fg      oklch(0.2 0.01 255)  → #1a1d24
 *   --secondary       oklch(0.3 0.02 255)  → #2b3041
 *   --muted           oklch(0.27 0.015 255)→ #232732
 *   --muted-fg        oklch(0.75 0.01 255) → #b8bcc4
 *   --accent          oklch(0.64 0.15 325) → #d56db5   (MAGENTA — accent)
 *   --border          oklch(1 0 0 / 16%)   → rgba(255,255,255,0.16)
 *   --destructive     oklch(0.704 0.191 22.216) → #ec5e5e
 */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#161924",
        foreground: "#f3f5f9",
        card: "#23272f",
        "card-translucent": "rgba(35, 39, 47, 0.82)",
        popover: "#1d212a",
        "popover-foreground": "#f3f5f9",
        primary: "#3eddc0",
        "primary-foreground": "#1a1d24",
        secondary: "#2b3041",
        "secondary-foreground": "#f3f5f9",
        muted: "#232732",
        "muted-foreground": "#b8bcc4",
        accent: "#d56db5",
        "accent-foreground": "#f3f5f9",
        destructive: "#ec5e5e",
        border: "rgba(255,255,255,0.16)",
        input: "rgba(255,255,255,0.20)",
        ring: "#3eddc0",
        // Brand gradients (used for hero text via <Text> with text-primary then accent)
        "brand-from": "#3eddc0",
        "brand-to": "#d56db5",
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
        "4xl": "28px",
      },
    },
  },
  plugins: [],
};
