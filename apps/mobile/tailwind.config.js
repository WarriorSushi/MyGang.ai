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
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        "card-translucent": "rgba(var(--card-translucent), 0.82)",
        popover: "rgb(var(--popover) / <alpha-value>)",
        "popover-foreground": "rgb(var(--popover-foreground) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        "secondary-foreground": "rgb(var(--secondary-foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-foreground) / <alpha-value>)",
        destructive: "rgb(var(--destructive) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
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
