# MyGang.ai — Native Mobile App Design Spec

| | |
|---|---|
| **Status** | Approved 2026-04-29, ready for implementation planning |
| **Date** | 2026-04-29 |
| **Owner** | Syed Irfan (Nrrdenterprises@gmail.com) |
| **Authors** | Syed Irfan (product) + Claude Opus 4.7 (technical) |
| **Plan file** | `docs/superpowers/plans/2026-04-29-mobile-app-plan.md` *(written next)* |
| **Related** | `design_docs/01_PRD.md`, `design_docs/02_ARCHITECTURE.md` |

---

## TL;DR

Build a **native cross-platform mobile app** for MyGang.ai using **React Native + Expo + TypeScript**, with **full feature parity** with the web app at launch. Convert the existing Next.js repo into a **pnpm/Turborepo monorepo** with `apps/web`, `apps/mobile`, and `packages/shared`. The mobile app consumes the existing Next.js `/api/*` routes as its backend — no separate mobile API. Estimated solo timeline: **~6 months**, phased so the live web app keeps shipping throughout.

Android first; iOS within ~12 months on the same codebase.

---

## 1. Background & motivation

### 1.1 The product
MyGang.ai is an AI group-chat web app where users build a "gang" of fictional characters (14 hand-crafted personas) that talk to the user *and to each other*. Live at https://mygang.ai.

### 1.2 Existing stack (web)
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **State:** Zustand
- **Backend services:** Supabase (Postgres + auth + realtime), Vercel (hosting + functions)
- **AI:** Vercel `ai` SDK with Google Generative AI + OpenRouter providers
- **Payments:** DodoPayments
- **Email:** Resend
- **Anti-abuse:** Cloudflare Turnstile
- **Rate limiting:** Upstash Redis
- **Monitoring:** Sentry
- **Push (web):** `web-push` (already implemented)
- **Already PWA-capable:** `manifest.json`, `sw.js`, `offline.html`, icons in `/public`

### 1.3 Why a native mobile app?
The user wants users to be able to do everything in the mobile app that they can do on the web. A wrapped-PWA approach (TWA) was considered and rejected by the user in favor of a full native rewrite.

### 1.4 Constraints
- **Solo developer** (vibe-coder workflow — AI assistant writes the code, user makes product decisions).
- **Live web app must keep working and shipping** throughout the rewrite.
- **Two AI agents may share the work**: Claude Code primarily, Codex (OpenAI) when Claude usage limits are hit. Documentation must be agent-agnostic.
- **Play Store policy:** digital-goods subscriptions on Android **must** use Google Play Billing — DodoPayments cannot process them inside the Android app.
- **Mobile app bundle is decompilable.** No production secrets ship in the binary; only public-by-design values.

---

## 2. Approved decisions

The four foundational decisions, made during brainstorming on 2026-04-29:

| # | Question | Decision | Reasoning summary |
|---|---|---|---|
| 1 | iOS in scope? | **Yes, within ~12 months** | Rules out pure-native Kotlin; favors cross-platform |
| 2 | Stack | **React Native + Expo + TypeScript** | Reuses Zod schemas, types, business logic, AI SDK, Supabase JS from web codebase |
| 3 | v1 scope | **Full feature parity at launch** | User's explicit choice — every web feature must exist on mobile |
| 4 | Repo structure | **Monorepo (pnpm workspaces + Turborepo)** | Shared `packages/shared` lets one change update both apps |

Additional decisions made implicitly:

- **Styling on mobile:** NativeWind (Tailwind for RN) — keeps `className` strings ~90% reusable from web.
- **Routing on mobile:** Expo Router — file-based, mirrors Next.js App Router mental model.
- **Animations on mobile:** Reanimated 3 (Framer Motion is web-only).
- **Server state cache:** TanStack Query (RN doesn't have Next's server-component caching).
- **Forms on mobile:** `react-hook-form` + Zod resolver (Radix is web-only).
- **In-app purchases:** `react-native-iap` — covers both Android (Play Billing) and iOS (StoreKit) future.
- **Marketing pages stay web-only:** `/about`, `/blog`, `/faq`, `/privacy`, `/terms`, `/replika-alternative`, `/refund`, `/status`, public landing, `/admin`. Mobile app is the product surface, not the marketing surface.

---

## 3. Architecture

### 3.1 Monorepo layout

```
mygang/                              ← repo root (formerly the Next.js repo)
├── apps/
│   ├── web/                         ← existing Next.js code, moved verbatim
│   └── mobile/                      ← new Expo React Native app
├── packages/
│   ├── shared/                      ← TS-only, no UI. Imported by both apps.
│   │   ├── characters/              ← 14 character configs, personas, prompt fragments
│   │   ├── schemas/                 ← Zod schemas (chat, API contracts, settings)
│   │   ├── types/                   ← TS types (User, Conversation, Subscription, etc.)
│   │   ├── prompts/                 ← prompt-building logic per character
│   │   ├── supabase/                ← typed Supabase client factory + DB types
│   │   └── api-client/              ← typed fetch wrappers around /api/* endpoints
│   └── eslint-config/               ← shared lint config
├── turbo.json                       ← pipelines (build, lint, test) with caching
├── pnpm-workspace.yaml
├── package.json                     ← workspace root
├── AGENTS.md                        ← agent-agnostic project context (Codex + Claude)
└── CLAUDE.md                        ← one-line pointer to AGENTS.md
```

### 3.2 Backend strategy
- The web app's existing **Next.js `/api/*` routes are the single backend** for both web and mobile.
- The mobile app calls them over HTTPS via the typed `api-client` package.
- No separate mobile backend. No code duplication on the server side.
- CORS is opened to allow Expo dev clients + the production app's bundle ID, with auth enforced via Supabase JWT in the `Authorization` header.

### 3.3 Auth strategy
- **Supabase Auth** is the auth source on both web and mobile.
- On mobile, JWTs persist in **AsyncStorage** (not cookies). The Supabase JS SDK handles this via the configured storage adapter.
- **Email/password** flows: built-in to Supabase, just consumed from RN.
- **Google OAuth:** `expo-auth-session/providers/google` opens the native consent sheet; callback returns to a custom URL scheme `mygang://auth/callback`.
- **Magic links / password reset:** email links use the `mygang://reset-password?token=…` scheme so the email opens the app.
- All deep-link routes are added to Supabase Auth → Redirect URLs allowlist.

### 3.4 Realtime strategy
- **Supabase Realtime** works natively on RN with the standard JS SDK.
- Foreground-resume handler reconnects sockets dropped during background/Doze.
- A subtle "reconnecting" indicator in the chat UI when the websocket is down.

### 3.5 Push notifications strategy
- **Mobile:** `expo-notifications` client + **Firebase Cloud Messaging (FCM)** as transport on Android (APNs on iOS later).
- **New API endpoint:** `/api/push/register` stores the device's FCM token alongside the user (Supabase table: `push_tokens`).
- Server sends pushes via the FCM HTTP v1 API.
- The existing **Web Push** implementation continues working unchanged for web users — the two paths run in parallel.

### 3.6 Payments strategy (the major architectural addition)
- **Web users:** DodoPayments unchanged.
- **Android users:** Google Play Billing via `react-native-iap`. Subscriptions defined in Play Console.
- **iOS users (future):** Apple StoreKit via the same `react-native-iap`.
- **New API endpoint:** `/api/billing/play-receipt` verifies Android receipts server-side via the Google Play Developer API and updates the Supabase `subscriptions` table.
- **Single source of truth:** the Supabase `subscriptions` table. The app reads `subscription.tier` and never cares which biller created it.
- Real-time updates: Play sends Real-time Developer Notifications via Pub/Sub → webhook → updates Supabase.

### 3.7 Anti-abuse strategy
- Web: **Cloudflare Turnstile** (already in place).
- Mobile: **Play Integrity API** (Android) + **App Attest** (iOS, future).
- `/api/chat` and `/api/auth/*` accept either a Turnstile token (web) or a Play Integrity token (Android), enforced via middleware.

### 3.8 Secrets handling on mobile
The mobile bundle is decompilable. Only **public-by-design** values may ship in it:

| Allowed in mobile bundle | Forbidden in mobile bundle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase service-role key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | OpenRouter API key |
| Sentry mobile DSN | DodoPayments API keys |
| Google OAuth **client ID** | Google OAuth **client secret** |
| Turnstile **site** key (web only, not mobile) | Resend, Meta CAPI, Upstash tokens |
| FCM sender ID | Cron secret, admin secrets |

Anything sensitive lives behind `/api/*` routes on Vercel and is reached via authenticated calls.

### 3.9 Mobile-app technical stack summary

**Tier 1 — drop-in (same package or trivial adapter):** TypeScript, Zod, Zustand, `@supabase/supabase-js` (+ `react-native-url-polyfill` + AsyncStorage), Vercel `ai` SDK + `useChat`, `lottie-react-native`, `@sentry/react-native`, `lucide-react-native`.

**Tier 2 — easy translations (different API, same idea):** Next App Router → **Expo Router**; Framer Motion → **Reanimated 3**; Tailwind classes → **NativeWind v4**; (none) → **TanStack Query**; Radix UI → **`react-hook-form` + Zod resolver**.

**Tier 3 — net-new for mobile:** `expo-notifications` + FCM, `expo-auth-session` + deep linking, `react-native-iap` + Play Billing, Play Integrity API, app icon/adaptive icon/splash, Play Store listing assets.

---

## 4. Migration plan (phased)

The single most important rule: **the live web app keeps working and keeps shipping the entire time.** No "stop the world" cutover.

### Phase 0 — Foundation (≈2 weeks)
**Goal:** Monorepo exists, web app works exactly as before, Expo app boots to a "Hello World" `.apk` on the user's phone.

- Restructure repo into `apps/web/` + `apps/mobile/` + `packages/shared/`. `git mv` preserves history.
- pnpm workspaces + Turborepo at the root.
- Vercel deploy repointed at `apps/web/`.
- Existing Playwright suite must pass identically.
- Initialize `apps/mobile/` as a fresh Expo SDK 54+ project with TypeScript, Expo Router, NativeWind, Reanimated, AsyncStorage, Supabase JS + url-polyfill, Sentry RN.
- First lift into `packages/shared`: Zod schemas + TS types only.
- Set up EAS Build. First production-style `.apk` installed on the user's phone.
- **Start Play Console developer account paperwork** ($25 one-time fee, can take days for verification).

**Exit criterion:** an `.apk` opens to a blank screen with "MyGang" text. Pipeline is end-to-end working.

### Phase 1 — Auth + app shell (≈3 weeks)
**Goal:** A user can install the APK, sign up or log in (email/password + Google), reset their password, and land on a placeholder home screen. Deep linking from auth emails works.

- Configure Expo deep linking (`mygang://`) and Supabase Auth redirect URLs.
- Auth screens: sign-up, sign-in, forgot-password, reset-password, post-auth onboarding.
- Google OAuth via `expo-auth-session`.
- Expo Router file tree mirroring web's important routes: `/(auth)/`, `/(app)/chat`, `/(app)/settings`, etc.
- Sentry RN installed; confirm a deliberate crash reports up.

**Exit criterion:** persistent session across app restarts; deep links from password-reset email open the app correctly.

### Phase 2 — Core chat experience (≈6 weeks)
**Goal:** The product. Group chat with all 14 characters, AI streaming, realtime, persistent history.

- Lift character configs and prompt-builders into `packages/shared/characters/` and `packages/shared/prompts/`. Refactor web to import from there too — both apps share the source of truth.
- Character roster + selection screen.
- Group chat: message list (FlashList), composer, typing indicators, multi-character interleaving.
- AI streaming via `useChat` from the Vercel `ai` SDK against existing `/api/chat`.
- Supabase Realtime for cross-device sync.
- Chat history loading + infinite scroll.
- Image rendering, link previews, message actions (copy, retry, delete).

**Exit criterion:** a real internal-test user can have a multi-character group chat on their phone and it feels at parity with the web experience.

### Phase 3 — Push, settings, account (≈4 weeks)
**Goal:** Feature-complete for free-tier users. Push notifications work natively.

- FCM project in Firebase Console. Android push credentials uploaded to EAS.
- `expo-notifications` integration: token registration, permission flow, foreground/background handling, deep links from notification tap.
- New `/api/push/register` endpoint + server logic to send pushes to mobile clients.
- Settings screens: account, notifications, theme, language, delete account.
- Profile editing.
- Smaller things: about, privacy/terms (rendered in WebView), support contact, version info.

**Exit criterion:** push notifications wake the app reliably; all non-billing settings pages work.

### Phase 4 — Billing & Play Console (≈6 weeks)
**Goal:** Paid tiers work on Android via Google Play Billing. Web users still pay via DodoPayments. Subscription state in Supabase is the single source of truth.

- Play Console: app listing draft, internal testing track, subscription products defined matching DodoPayments products (Basic, Pro).
- `react-native-iap` integration: purchase flow, restore purchases, subscription management deep-link to Play Store.
- New `/api/billing/play-receipt`: receives receipts, verifies via Google Play Developer API, updates Supabase.
- Real-time subscription updates via Pub/Sub webhook.
- Paywall UI in mobile, upgrade flow opens Play's native sheet.
- Test every state transition with sandbox accounts: subscribe, cancel, refund, grace period, upgrade between tiers, restore purchases.

**Exit criterion:** Android subscribers and web subscribers have the same effective access. All billing edge cases tested.

### Phase 5 — Polish & closed beta (≈4 weeks)
- Animations + haptics (Reanimated polish, `expo-haptics`).
- Professional app icon, adaptive icon, splash screen.
- Play Store listing assets: feature graphic, screenshots, store description.
- Performance pass: bundle size, cold-start time, scroll perf, memory under long chats.
- Accessibility: screen-reader labels, dynamic font sizing, contrast.
- Push to Play Store **closed testing track**, invite ~50 users, gather feedback.

**Exit criterion:** closed-beta users report no blockers; crash-free user rate >99%.

### Phase 6 — Launch (≈2-4 weeks)
- Address closed-beta feedback.
- Promote to Play Store **production** with a 10% staged rollout.
- EAS Update for OTA hotfixes.
- Monitoring playbook: Sentry alerts, crash-free rate target >99.5%.

**Exit criterion:** v1 stable on production, full rollout, monitoring green.

### Total realistic timeline: ~6 months solo, full-time-equivalent
Calendar time will be longer if web-app feature work continues in parallel (which it will).

---

## 5. Distribution & ops

### 5.1 Build pipeline (EAS Build)
Three build profiles in `eas.json`:
- `development` — debug build with the Expo dev menu, for local testing.
- `preview` — release `.apk`, installable directly via link, for closed testers.
- `production` — `.aab` (Android App Bundle) signed for the Play Store.

### 5.2 OTA updates (EAS Update)
- Non-native bug fixes ship over the air without Play Store re-submission.
- Channels match build profiles; closed testers get hotfixes faster than production.
- Limit: any change adding/removing a native dependency requires a full Play Store re-submission.

### 5.3 Play Store track strategy
1. **Internal testing** — Phases 0–4. Up to 100 testers, instant publishing.
2. **Closed testing** — Phase 5. ~50 invited users via email lists. One-time review (~24-48h).
3. **Open testing** *(optional)* — between closed and production. Anyone with the link.
4. **Production** — Phase 6. Public Play Store. Reviews ~1-7 days first time, often <24h after.

**Production rollout:** start at 10% staged. If crash-free rate stays >99.5% for 24-48h, bump to 50%, then 100%. Halt + ship a JS-only hotfix via EAS Update if something breaks.

### 5.4 Monitoring
- **Sentry** mobile project (separate DSN, same org as web). Crash-free user rate target >99.5%.
- **Play Console vitals** — Google's own crash/ANR/battery reporting. Check weekly.
- **Backend monitoring** unchanged — Vercel + Sentry already cover `/api/*`.

### 5.5 CI/CD
- **GitHub Actions** for every PR: type-check, lint, test, conditional `eas build --profile preview` when `apps/mobile/` changes.
- **No automatic Play Store publishing.** User clicks "promote" manually for production.

---

## 6. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Web app breaks during monorepo restructure | Medium | High | Phase 0 runs Playwright after the move. Move is purely mechanical (`git mv` + workspace config). No logic changes in the same commit. |
| Streaming AI on RN behaves differently than web | Medium | Medium | Test `ai` SDK's RN support against `/api/chat` early in Phase 2. Fallback: manual SSE parsing. |
| Supabase Realtime websocket flakiness on cellular | Medium | Medium | Built-in reconnect + foreground-resume reconnection logic + UI indicator. |
| Play Billing edge cases | High | High | Phase 4 dedicated to billing. Buffer week. Sandbox-test every state transition. |
| Play Store rejection on first submission | Medium | Medium | Privacy-policy URL ready, deep links handled, AI-content disclosure verified before submission. |
| DodoPayments + Play Billing dual reconciliation bugs | Medium | High | One Supabase `subscriptions` table; both billers' webhooks update it. Integration tests for both paths. |
| Cold-start time on entry-level Android | Medium | Medium | Test on a real cheap device by Phase 3. Hermes + bundle splitting + lazy screens. |
| Web-app feature creep during rewrite | High | Medium | Be conservative on web feature additions during Phases 2–4. Anything added must also be planned for mobile. |
| User hits 6-month wall and wants to give up | Low-medium | High | Internal-track releases every 2-3 weeks throughout. Phase boundaries are decision points. |
| Codex picks up mid-phase and goes off-script | Medium | Medium | Agent-agnostic `AGENTS.md` + checkbox plan + session logs. |
| User forgets what was decided 3 months ago | High | Low (with mitigations) | `docs/superpowers/decisions/` — every non-obvious choice gets a 5-line note. |

---

## 7. Out of scope (intentional)

- **iOS app for v1.** Same RN codebase will produce iOS later; not in this design.
- **Marketing/SEO pages on mobile:** `/about`, `/blog`, `/faq`, `/privacy`, `/terms`, `/replika-alternative`, `/alternative`, `/refund`, `/status`, public landing, `/pricing` (the public landing version). Stay web-only.
- **Admin panel on mobile.** `/admin` is web-only forever.
- **A separate mobile backend.** The Next.js `/api/*` routes serve both apps.
- **Wrapped-PWA / TWA / Capacitor approach.** Considered and rejected by the user in favor of full native rewrite.

---

## 8. Open questions / future decisions

- **Does the web app currently use Google OAuth, email/password, or both?** Verified email/password from `/forgot-password` + `/reset-password` routes. Google OAuth client credentials exist in env vars. Confirm both are user-facing options before Phase 1.
- **Push notification triggers:** what events should send a push? (e.g. character replies while you're away, daily check-in nudge). To be defined during Phase 3 design.
- **Subscription tier feature gating on mobile** — should match web exactly. Verify the `subscription.tier` → feature mapping in `packages/shared` covers every gate.
- **Localization:** the spec assumes English-only. If multi-language is in scope, add an i18n decision before Phase 2.

---

## 9. Glossary (vibe-coder reference)

- **Monorepo:** one git repository containing multiple related apps/packages.
- **pnpm workspaces / Turborepo:** the tools that let multiple apps share dependencies and code in one repo.
- **`.aab` vs `.apk`:** `.aab` is the format Google Play requires for new submissions. `.apk` is the older direct-install format, used for sideloading testers.
- **EAS Build:** Expo's cloud service that turns the JS source into a signed Android binary.
- **EAS Update:** Expo's over-the-air update service; ships JS-only changes without Play Store re-submission.
- **FCM:** Firebase Cloud Messaging; Google's push-notification transport on Android.
- **APNs:** Apple Push Notification service; iOS equivalent of FCM.
- **TWA:** Trusted Web Activity; a wrapped-PWA approach for Android. Considered, rejected by user.
- **Reanimated 3:** the standard React Native animation library; runs animations on the UI thread for 60fps.
- **NativeWind:** Tailwind CSS adapted to React Native — same `className` strings work.
- **Hermes:** the JS engine RN uses by default; faster cold-start than JSC.
- **Play Console:** Google Play Store's developer dashboard; where the app listing + tracks + billing products live.
- **Play Billing:** Google's mandatory in-app purchase API for digital subscriptions on Android.
- **Play Integrity API:** Google's anti-abuse service that proves "this request came from a real, untampered build of your app on a real device."

---

## 10. Change log

| Date | Change | Author |
|---|---|---|
| 2026-04-29 | Initial spec written, all 4 foundational decisions approved | Syed Irfan + Claude Opus 4.7 |
