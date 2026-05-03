# Mobile ⇄ Web UI/UX Parity Audit

**Date:** 2026-05-03
**Scope:** Full-app visual + motion parity audit. Mobile React Native (Expo SDK 54 + NativeWind v4 + Reanimated 4) vs Web (Next.js 16 + Tailwind v4 + framer-motion).
**Method:** Live Playwright capture of every web screen on production (`https://mygang.ai`), 4 parallel subagents comparing screenshots + web source against mobile source, deltas tagged + scored + deduped.

---

## Executive summary

**100 distinct deltas found** across auth, onboarding, chat, settings, and pricing. After dedup, they cluster into **8 cross-screen themes** + **per-screen specifics**. About 35% are "fix now" (small, high-impact), 40% are "fix later" (medium effort, medium impact), 25% are "skip" (different by necessity) or "defer" (blocked on Phase 3/4).

**The single biggest perception gap:** mobile chat bubbles are heavily character-tinted solid blocks. Web chat bubbles are 85%-neutral with a faint persona hint, grouped corners, inline name+archetype, inline like/reply icons under each. A user opening both apps side-by-side would see two different chat surfaces — same brand, very different feel.

**The single biggest "wow"-tier missing feature:** the Avatar Style step. Web has horizontal-snap carousel cards with hero images, animated marquee of 10+ avatars per pack, "FREE GIFT" diagonal ribbons, and (on Human/Retro) animated conic-gradient borders. Mobile shows static cards. The "gift" emotional moment doesn't land.

**The biggest functional gap:** the /settings page is missing 6 features web has — Change Email, Change Password, Usage card, Retake Vibe Quiz, Delete All Chat, Delete All Memories, Start Fresh, Legal links. Plus the destructive-actions backend on mobile only marks `deletion_requested_at` instead of actually purging data.

---

## Cross-screen themes (fix once, benefit many)

These are patterns that show up across multiple screens. Fixing them at the design-system level cascades visible improvements everywhere.

### Theme 1 — `PrimaryButton` shape mismatch (affects every screen)

**Web:** Gradient pill `from-sky-400 via-cyan-300 to-emerald-300` (auth) or solid `bg-primary` rounded-full pill (rest), uppercase tracked text `font-black tracking-[0.18em]` on auth gradient buttons, lucide ArrowRight icon for forward CTAs, `active:scale-[0.98]` press, `shadow-primary/10` glow.

**Mobile:** Solid teal `bg-primary` button, `rounded-2xl` (not full pill), mixed-case `font-bold`, no icon, no press scale, no glow shadow.

**Recommendation:** **fix** (P0 — single component touches dozens of screens).
**Effort:** S–M. Update `apps/mobile/components/primary-button.tsx` to support: variant prop (`gradient` | `solid`), `iconRight` prop, full-pill mode, press-scale animation, brand-glow shadow.

### Theme 2 — Glass card chrome with eyebrow pill (auth + onboarding cards + settings cards)

**Web:** Forms and major content blocks live inside a `rounded-[2rem] border-white/10 bg-[rgba(7,12,20,0.74)] backdrop-blur-xl shadow-[0_40px_90px_-48px_rgba(15,23,42,0.9)]` "glass card" frame. Above the H1 inside, a tinted rounded-full eyebrow pill (e.g. "PASSWORD RECOVERY", "REVIEW", "LAUNCH PRICING — SAVE 80%").

**Mobile:** Forms render flat against the screen background. No card frame, no eyebrow pill, no brand-glow shadow.

**Recommendation:** **fix** (P0). Build a reusable `<GlassCard>` and `<EyebrowPill>` component. Apply to: sign-in, sign-up, forgot-password, reset-password, onboarding step containers, settings cards.
**Effort:** M (~2 hrs to build + apply across screens). BlurView approximates the backdrop-blur-xl; the rest is straightforward.

### Theme 3 — Native `Alert.alert` vs glass `<Dialog>` for confirmations

Affects: delete account, delete memory, sign out, send-failed errors, "could not save" errors across most screens.

**Web:** All confirmations use a custom `<Dialog>` with backdrop-blur-2xl, 2rem radius, AlertTriangle icon, two-step destructive confirm.

**Mobile:** Almost everything uses native `Alert.alert()`. OS-styled modal breaks visual continuity with the rest of the app.

**Recommendation:** **fix** (P0). Build a single `<ConfirmDialog>` component (modal + glass + icon + two action buttons). Replace `Alert.alert` calls throughout.
**Effort:** M.

### Theme 4 — Step indicator dots (onboarding-wide)

**Web:** 7-dot horizontal pagination indicator at top of every onboarding step, current step in primary-emerald, past in emerald, future muted. Visible on every step.

**Mobile:** No dots anywhere. Only a "← Back" pill in the corner. User has zero sense of progress.

**Recommendation:** **fix** (P0 — single component, instantly visible).
**Effort:** S (one small component, render in `onboarding.tsx` orchestrator).

### Theme 5 — Step / page transitions: cuts vs slides

**Web:** framer-motion `AnimatePresence` between every onboarding step (`x: 18 → 0 → -18`, ~250ms, `[0.16, 1, 0.3, 1]` easing). Vibe-quiz Q1→Q2→Q3 also slides.

**Mobile:** `setStep("X")` cuts to next step instantly. No transition.

**Recommendation:** **fix** (P0 for onboarding — primary motion identity of the flow).
**Effort:** M. Use Reanimated 4 layout animations or `Animated.View` with `entering={SlideInRight}` / `exiting={SlideOutLeft}`.

### Theme 6 — Wallpaper rendering — flat vs vivid

**Web:** Each `chat_wallpaper` (`neon`, `aurora`, `sunset`, etc.) renders as **multi-stop radial-gradient blobs** — neon = vivid green + blue + magenta circles bleeding into each other. Visible in screenshot 11.

**Mobile:** `WallpaperBackground` renders as a 3-color **linear gradient** with **near-black slate colors** (`#0c1a23`, `#1c1330`, `#0c1c1d` for neon). Result: the wallpaper feature is barely visible.

**Recommendation:** **fix** (P0). Wallpaper is a paid feature differentiator — currently invisible on mobile.
**Effort:** M. Use multiple absolutely-positioned `expo-linear-gradient` views with `transform: scale + skew` to fake radial blobs, or use `react-native-svg` with `RadialGradient`. Match web's actual hex stops.

### Theme 7 — Eyebrow micro-typography

**Web:** Section labels and category eyebrows use `text-[10px] uppercase tracking-widest text-muted-foreground` consistently (settings sections, promo card headers, status text).

**Mobile:** Mostly correct (`text-[11px] font-semibold uppercase tracking-widest`) but weight is off (`font-semibold` vs nothing) and the 1px size delta adds up across the app.

**Recommendation:** **fix** (P1). Tiny but pervasive.
**Effort:** S. One global find/replace pass.

### Theme 8 — `<InlineToast>` vs `Alert.alert` for transient feedback

**Web:** Bottom-center toast component with message + optional action button + dismiss, used for offline / history-error / screenshot-success / etc.

**Mobile:** Uses `Alert.alert()` for every transient message.

**Recommendation:** **fix** (P1). Component already exists conceptually on web — port it.
**Effort:** S.

---

## Per-screen punch list

### Auth screens (sign-in, sign-up, forgot-password, reset-password) — P0 group

| # | Delta | Tag | Sev | Effort | Rec |
|---|---|---|---|---|---|
| A1 | Glass card chrome around form (covered by Theme 2) | L | 3 | M | fix |
| A2 | Radial gradient ambient background | B | 2 | S | fix |
| A3 | Eyebrow pill above H1 ("PASSWORD RECOVERY" etc.) | B | 2 | S | fix |
| A4 | Submit button gradient + uppercase tracking (Theme 1) | B | 3 | S | fix |
| A5 | Input field rounded-xl + bg-white/[0.03] + focus ring (sky-300/60) | C | 2 | S | fix |
| A6 | Forgot-password helper copy ("If you usually sign in with Google…") | L | 1 | S | fix |
| A7 | "Check your email" success state with icon medallion | L | 2 | S | fix |
| A8 | Reset-password 3 distinct states (verifying / invalid / success) with icon medallions | L | 2 | M | fix |
| A9 | Mount-entrance animation (fade + translate-up) | M | 2 | M | fix |
| A10 | Cloudflare Turnstile widget | C | — | — | **skip** (forbidden in mobile) |
| A11 | Hover states on interactive elements | C | — | — | **skip** |

### Onboarding (all 8 steps) — P0 group

| # | Delta | Tag | Sev | Effort | Rec |
|---|---|---|---|---|---|
| O1 | Step indicator dots at top (Theme 4) | L | 3 | S | fix |
| O2 | Step transitions slide horizontally (Theme 5) | M | 3 | M | fix |
| O3 | Welcome: gradient direction + mid-stop (teal→neutral→mauve) | B | 2 | S | fix |
| O4 | Welcome: CTA arrow as lucide icon, not ASCII string in label | C | 2 | S | fix |
| O5 | Identity: input focus emerald ring | C | 2 | S | fix |
| O6 | Vibe Quiz: Q1→Q2→Q3 slide animation | M | 3 | M | fix |
| O7 | Vibe Quiz: option button press-elevation animation | M | 2 | S | fix |
| O8 | Vibe Quiz: selected option uses `bg-primary/8` not `bg-white/5` | B | 1 | S | fix |
| O9 | Vibe Review: slide-in from Q3 (mobile already has the screen, just no motion) | M | 2 | S | fix |
| O10 | **Avatar Gift: animated marquee carousel (the "wow" moment)** | C | 3 | L | fix |
| O11 | Avatar Gift: gift icon scale+rotate-in + staggered text fades | M | 2 | S | fix |
| O12 | Avatar Style: horizontal snap carousel (not vertical stack) | L | 2 | M | fix |
| O13 | Avatar Style: hero card has 3 thumbnails + "10+ more" overlay on last | C | 2 | S | fix |
| O14 | Avatar Style: animated conic-gradient border on Human/Retro packs | B | 2 | L | **defer** (Reanimated work) |
| O15 | Avatar Style: "FREE GIFT" red ribbon larger + correct offset | B | 1 | S | fix |
| O16 | Avatar Style: selection ring `border-[3px] + ring-[3px] ring-primary/35` | B | 1 | S | fix |
| O17 | Avatar Style: bottom bar copy "You have selected the X avatar pack." | L | 1 | S | fix |
| O18 | Selection: "Details" button per card → opens character detail modal | C | 3 | M | fix |
| O19 | Selection: bottom-bar shows mini-avatars of selected (not just text count) | C | 2 | S | fix |
| O20 | Selection: recommended badge `bg-primary/90` not `bg-amber-400` | B | 1 | S | fix |
| O21 | Selection: selection ring + glow shadow | B | 2 | S | fix |
| O22 | Selection: card layout animation when recommended cards float to top | M | 2 | M | **defer** |
| O23 | Friends Intro: input fields use `bg-white/80 text-black` light pill (currently dark) | B | 3 | S | fix |
| O24 | Friends Intro: "Details" button → reuses Selection's character modal | C | 2 | M | fix |
| O25 | Friends Intro: bottom bar inline (count left, button right) not stacked | L | 1 | S | fix |
| O26 | Loading: replace ActivityIndicator with morphing checklist (Aceternity-style) | M | 2 | M | fix |
| O27 | Selection: 3-col grid on portrait mobile (vs 5-col web) | L | — | — | **skip** (correct for portrait) |

### Chat (message list + bubbles + header + input) — P0 group

| # | Delta | Tag | Sev | Effort | Rec |
|---|---|---|---|---|---|
| C1 | **AI bubbles: 85%-neutral blend with persona hint, not solid character-color** | C | 1 | S | fix |
| C2 | **Grouped corners (single/first/middle/last) for consecutive messages from same speaker** | C | 2 | M | fix |
| C3 | Persona name + archetype/role inline above bubble (e.g. "Rico the wildcard") | C | 2 | S | fix |
| C4 | Inline like + reply icons under each bubble (always visible) | C | 2 | M | fix |
| C5 | Per-message timestamp + relative time row (e.g. "05:08 PM · 32m ago") | C | 2 | S | fix |
| C6 | Message arrival animation (slide/fade-in for new messages) | M | 2 | S | fix |
| C7 | "Resumed your last session" pill at top of message area | C | 2 | S | fix |
| C8 | "While you were away" divider for autonomous-arrival messages | C | 3 | S | **defer** (needs `source` plumbing) |
| C9 | Scroll-to-latest FAB with unread count when scrolled up | C | 2 | S | fix |
| C10 | Quoted-reply rendering above replied-to messages | C | 2 | M | **defer** (needs reply model) |
| C11 | Delivery status (Sending/Sent/Failed + Retry) under user messages | C | 3 | M | **defer** |

### Chat header — P0

| # | Delta | Tag | Sev | Effort | Rec |
|---|---|---|---|---|---|
| H1 | Right cluster as 4 ghost-style 36–40px circular icon buttons (Refresh, Brain, Theme, Settings) | C | 1 | S | fix |
| H2 | Drop "Toggle theme" button (mobile is dark-locked per spec) | C | — | — | **skip** |
| H3 | Status row: "{n} online · Starter memory" with green/amber pulsing dot, drop "Your gang" title | C | 2 | S | fix |
| H4 | Plan/mode badge in header (Pro/Basic crown icon, Ecosystem violet pill) | C | 3 | S | fix (low priority) |

### Chat input — P0

| # | Delta | Tag | Sev | Effort | Rec |
|---|---|---|---|---|---|
| I1 | Single rounded-pill container wrapping textarea + send button (currently two siblings) | C | 2 | S | fix |
| I2 | Send button: circular green with arrow icon (currently text "Send" pill) | C | 1 | S | fix |
| I3 | Placeholder copy: "Send a message..." (currently "Message your gang") | L | 3 | S | fix |
| I4 | Starter chips above input when no user message yet | C | 2 | S | fix |
| I5 | Char counter at >1500 + warning at limit | C | 3 | S | fix |
| I6 | Reply chip above input ("Replying to {name}") | C | 3 | M | **defer** |

### Chat settings drawer — P0

| # | Delta | Tag | Sev | Effort | Rec |
|---|---|---|---|---|---|
| D1 | Header greeting "Hey, {userName}" + email + tier-color pill (FREE/Basic/Pro) | C | 1 | S | fix |
| D2 | Promo card "80% OFF LAUNCH / Unlock memory & unlimited messages" with $99 strikethrough + See plans CTA | C | 1 | M | fix |
| D3 | Segmented Chat Mode control with sliding pill animation, locked Ecosystem with amber helper text | C | 1 | S | fix |
| D4 | Preferences section with iOS-style toggle switches for Role Labels + Low-Cost Mode (currently missing entirely) | C | 2 | S | fix |
| D5 | Personalize section as icon-rows (circle icon + title + subtitle + chevron), in-drawer sub-panels for Wallpaper/Rename | C | 2 | M | fix |
| D6 | Wallpaper sub-panel: gradient swatch previews per option (currently text-only list) | C | 2 | S | fix |
| D7 | Account section as icon-rows (Settings2 icon, LogOut icon) | C | 3 | S | fix |
| D8 | Drawer width 85vw max 480px, opaque background (not BlurView) | C | 2 | S | fix |
| D9 | Stagger entry animation on settings rows (`staggerChildren: 0.04`) | M | 3 | S | fix (low priority) |

### Memory vault — P1 (pattern decision required)

| # | Delta | Tag | Sev | Effort | Rec |
|---|---|---|---|---|---|
| M1 | **Pattern: side drawer (web) vs fullscreen route (mobile)** | L | 1 | L | fix (port to side-drawer) |
| M2 | Header: Brain icon in primary-tinted square + "Memory Vault" + "WHAT THE GANG REMEMBERS" tracked subtitle | C | 2 | S | fix |
| M3 | "STARTER MEMORY PREVIEW" emerald promo card for free users | C | 1 | S | fix |
| M4 | Memory cards as `GlassCard` with content + date + emerald "PREVIEW" eyebrow | C | 2 | S | fix |
| M5 | Locked-memory blurred preview + violet→fuchsia "Unlock full memory" CTA | C | 2 | M | fix |
| M6 | Paid-tier search + edit/delete affordances | C | 2 | M | fix |
| M7 | Replace amber upsell card border with brand primary | B | 1 | S | fix |

### Settings page — P1 (large feature gap)

| # | Delta | Tag | Sev | Effort | Rec |
|---|---|---|---|---|---|
| S1 | Header: "SETTINGS" eyebrow + "Your Control Center" h1 + "BACK TO CHAT" pill | L | 2 | S | fix |
| S2 | Account card: hero username (2xl-black) + email below, not list rows | C | 2 | S | fix |
| S3 | Card style: `rounded-3xl border-border/50 bg-muted/40 p-6` (not `rounded-xl bg-card-translucent` thin) | B | 2 | S | fix |
| S4 | **Account Settings card: Change Email + Change Password** | F | 3 | M | fix |
| S5 | **80% OFF promo card with gradient border, $99 strikethrough, View Plans CTA** | F | 3 | M | fix |
| S6 | **Usage card: "25 messages per hour" + Free Tier label + live progress bar** | F | 2 | M | fix |
| S7 | Notifications card with Enable Notifications button | F | 2 | L | **defer** (Phase 3) |
| S8 | **Data Management card: Retake Vibe Quiz** | F | 2 | S | fix |
| S9 | **Data Management → Destructive Actions: Delete All Chat / Delete All Memories / Start Fresh** | F | 3 | L | fix |
| S10 | Sign Out as outline pill (not full-width destructive button) | C | 1 | S | fix |
| S11 | Danger Zone inline (typed-email confirm + two-step button) instead of separate `/(app)/delete-account` screen | C | 2 | S | fix |
| S12 | Legal & Info card (About / Privacy / Terms) | F | 2 | S | fix (app-store policy) |
| S13 | Theme toggle DARK/LIGHT pills | F | 1 | — | **skip** (mobile dark-locked) |

### Pricing page — P1

| # | Delta | Tag | Sev | Effort | Rec |
|---|---|---|---|---|---|
| P1 | Hero: "Choose your vibe" with gradient on "vibe" + "From casual hangs to unlimited chaos…" subhead | B | 3 | S | fix |
| P2 | Launch pricing badge "🚀 LAUNCH PRICING — SAVE 80%" | F | 2 | S | fix |
| P3 | **Plan cards have hero images** (`/plan-basic.jpg`, `/plan-pro.jpg`) | F | 3 | M | fix |
| P4 | **"MOST POPULAR" badge on Pro card with gradient border + glow** | F | 3 | M | fix |
| P5 | Price display: big 3xl-4xl + strikethrough $99 + red "SAVE 80%" pill | L | 2 | S | fix |
| P6 | Plan-card CTAs: animated conic-gradient borders | M | 2 | L | **defer** (Reanimated work) |
| P7 | Upgrade flow opens external browser instead of native checkout | F | 3 | L | **defer** (Phase 4 — Play Billing) |
| P8 | Comparison table | F | 1 | L | **skip** (web's mobile fallback is stacked-cards, similar to current mobile) |
| P9 | "Your personal group of friends, always with you" + 24/7 + 100% stats | F | 1 | M | fix |
| P10 | FAQ accordion (5 questions) | F | 2 | M | fix |
| P11 | Bottom CTA "Ready to unlock the full experience?" + Get Pro button | F | 2 | S | fix |
| P12 | Footer trust badges (Secure checkout / Cancel anytime / No hidden fees) | F | 1 | S | fix |
| P13 | Animated background blobs | B | 1 | L | **defer** |
| P14 | Card entrance motion (stagger fade+slide) | M | 1 | S | fix |

### Sub-pages (edit-gang, custom-names, delete-account)

| # | Delta | Tag | Sev | Effort | Rec |
|---|---|---|---|---|---|
| X1 | Edit-gang: header "Save" pill → use onboarding's bottom-pill primary instead | C | 1 | S | fix |
| X2 | Custom-names: rounded-xl → rounded-2xl/3xl to match other settings cards | B | 1 | S | fix |
| X3 | **Delete-account screen: should be inline in /settings Danger Zone (per S11)** | L | 2 | M | fix |
| X4 | Delete-account: two-step confirm pattern (button text changes on first click) | C | 2 | S | fix |
| X5 | Delete-account: use glass Dialog instead of Alert.alert (Theme 3) | B | 1 | M | fix |
| X6 | **Delete-account: backend stub doesn't actually purge data — only sets `deletion_requested_at`** | F | 3 | L | fix (real bug) |

---

## Recommended phasing

**P0 — "Mobile feels like web" pass (~2-3 sessions):**
- Themes 1, 2, 3, 4, 5, 6 (cross-screen wins — PrimaryButton, GlassCard, ConfirmDialog, step dots, step slides, wallpaper)
- All chat deltas C1–C7, H1, H3, I1–I3, I5, D1–D8 (chat surface = 95% of user time)
- All onboarding step deltas O1–O11, O15–O21, O23–O25 (first-impression critical)

**P1 — "Polish & feature parity" pass (~3-5 sessions):**
- Auth screen polish A1–A9
- Onboarding O12, O13, O18, O24, O26 (medium-effort items)
- Memory vault redesign as drawer M1–M7
- Settings page rebuild S1–S6, S8, S10–S12, X1–X5
- Pricing page rebuild P1–P5, P9–P12, P14

**P2 — "Premium polish" pass:**
- Animated borders (O14, P6)
- Reply system (C10, I6)
- Delivery status (C11)
- Background blobs (P13)

**Defer until Phase 3/4:**
- Notifications card (S7)
- In-app billing (P7)

**Bug to fix immediately (separate from parity):**
- X6 — delete-account backend stub doesn't purge data

---

## What I deliberately skipped

- **CSS backdrop-filter glass effects** — RN's `BlurView` approximates but isn't pixel-identical. Mobile uses BlurView already; matching the exact backdrop-blur-xl value isn't worth the effort.
- **Hover states / `:focus-visible` outlines** — web-only by nature.
- **Cloudflare Turnstile** — forbidden in mobile per spec hard rule #1.
- **Pricing comparison table** — web already falls back to stacked cards on narrow viewports, similar to current mobile.
- **Theme toggle (Dark/Light)** — mobile is dark-locked per spec.
- **Selection step 5-col grid** — 3-col is correct for portrait phone.
- **Avatar lightbox** — mobile is intentionally richer than web here.

---

## Method notes

- All web captures saved to `apps/mobile/audit/*.png` and `*.yml` (DOM snapshots).
- 4 parallel subagents (general-purpose) each owned one screen group: Auth, Onboarding, Chat, Settings+Pages.
- Each agent had: web screenshots + web component source + mobile component source + a consistent delta template.
- This synthesis dedups cross-screen patterns and orders by impact.
