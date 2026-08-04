# Codex Mobile Takeover Plan

**Date:** 2026-05-14
**Agent:** Codex
**Scope:** Stabilize the existing Expo mobile app, keep the deployed web app safe, then continue toward Play Store readiness.

## Current State

- Monorepo is already in place: `apps/web`, `apps/mobile`, `packages/shared`.
- Mobile is far past scaffold stage. It has auth, onboarding, chat, persisted history, settings, memory vault drawer, pricing, push-token registration, and Android billing scaffolding.
- Web remains the backend for mobile through `https://www.mygang.ai/api/*`.
- The older implementation-plan checkboxes are stale. Current code is ahead of the docs, so this file is the takeover source of truth until the phase docs are reconciled.

## What I Verified Today

- [x] Installed workspace dependencies with `pnpm install`.
- [x] Mobile typecheck passes: `pnpm --filter=@mygang/mobile typecheck`.
- [x] Mobile lint passes: `pnpm --filter=@mygang/mobile lint`.
- [x] Web fast tests pass: `pnpm --filter=@mygang/web test:fast` (21 script-style tests).
- [x] Web production build passes: `pnpm --filter=@mygang/web build`.
- [x] Expo SDK 54 patch versions are aligned (`expo` 54.0.36, `expo-font` 14.0.12, `expo-router` 6.0.24); Expo Doctor passes 18/18 checks.
- [x] EAS preview build completed successfully on 2026-07-18 (build `135c5488-6a31-4b0e-a91b-d05e73cd7f48`) and produced a signed Android APK.
- [x] Device-feedback replacement preview build completed successfully on 2026-07-18 (build `27f1db64-3ce2-4466-a9f6-f23c1edda980`) with the native keyboard fix.
- [x] Final chat-reliability preview build completed successfully on 2026-07-18 (build `554bd369-51cd-4d00-848b-7364dda57ad2`) with the editable composer, bounded send lifecycle, and purchase celebration.
- [x] The 2026-08-04 release-candidate gate passes mobile typecheck/lint/tests, Expo Doctor 18/18, Android export, all 22 web fast-test files, and the web production build.
- [x] Final native-auth preview build `85fc9cc9-d4f9-4b6d-82dd-27aef9f80054` installed and launched on Android; Google opens the Google Play services device-account flow with no browser/landing-page redirect.
- [x] Authenticated 411dp emulator audit completed on 2026-08-04 across chat, active send, offline failure, settings, themes, Memory Vault, and Edit Gang; findings are recorded in `docs/superpowers/2026-08-04-authenticated-mobile-emulator-audit.md`.

## Immediate Fixes Completed

- [x] Cleaned mobile lint errors from JSX copy/import ordering.
- [x] Removed a stale `eslint-disable` in mobile chat messages.
- [x] Switched pricing purchase finalization to the module-level `finishTransaction` import so lint no longer flags a missing hook dependency.
- [x] Fixed stale web tests after shared-code moves:
  - `chat-arrival` starter chips now satisfy the intended honest-vibe personalization.
  - `squad-persistence` test imports from `@mygang/shared`.
  - `system-prompt` test expects the current responder-restraint wording.
- [x] **Native Android Google sign-in:** standalone Android builds now select an account through Google Play services and exchange its ID token directly with Supabase; Expo Go/iOS retain the browser relay fallback.
- [x] **Android keyboard overlap:** chat now uses Expo's recommended native Keyboard Controller and a chat-specific `translate-with-padding` behavior.
- [x] **False free-tier limit:** production logs proved the configured Upstash hostname no longer resolves; Redis outages now retain a bounded local limiter, while mobile distinguishes real hourly quota responses from rapid-send/infrastructure failures.
- [x] **Narrow-screen message clipping:** message width is now derived once per list from the live viewport, with percentage caps on phones and a 560dp ceiling on tablets.
- [x] **Conversation-state polish:** network loss is reconciled before sending, transport failures stay inline and retryable, stale relative timestamps are gone, the current profile name wins over old context, and low-value/duplicate memory writes are filtered for every tier.

## Risks To Resolve Before Beta

- [x] **Hardcoded production API URLs:** mobile API calls now go through `apps/mobile/lib/config.ts` and `app.json > extra.apiBaseUrl`.
- [x] **Debug logging:** removed noisy mobile auth/onboarding `console.log` lifecycle messages.
- [x] **Onboarding route loop:** local auth profile state now updates even when an old Expo/Supabase session starts with `profile=null`.
- [x] **Retake Vibe Quiz route:** completed users can open `/onboarding?retake=true` without the app route gate immediately redirecting them away.
- [x] **Springy motion:** removed `withSpring`/`springify()` from mobile UI code and switched press feedback/drawer/card entrances to simple timing.
- [x] **Chat drawer scroll bugs:** separated drawer backdrops from drawer content, bounded drawer scroll containers, and stopped auto-scroll from fighting manual chat scrolling.
- [x] **AI replies vanish after reload:** mobile rendered-event persistence now uses the server `turn_id`, the web rendered-events route accepts mobile Bearer auth, and mobile has a direct Supabase fallback for Expo testing against the current deployed API.
- [x] **Chat sluggishness / VirtualizedList warning:** message row metadata is precomputed, FlatList render batches are smaller, chat input/header/list rows are memoized, chat callbacks are stable, and AsyncStorage message writes are debounced.
- [x] **Expo Go reload exits:** added a root app error boundary and made the pricing route Expo Go safe by removing its top-level `expo-iap` import; pricing opens the web checkout until Play Billing is verified in a dev/preview build.
- [x] **Chat header and drawer ergonomics:** compacted the chat header, added a right-edge swipe target for the settings drawer, added a real dark/light Appearance toggle to the drawer, and made drawer sub-panels reset when the drawer closes.
- [x] **Chat opens at latest message:** initial chat hydration now explicitly scrolls to the newest message after layout/interactions settle.
- [x] **Production readiness audit:** used parallel Codex sub-agents to compare web/mobile auth, chat, memory, settings, UX, and verification gaps.
- [x] **Sentry runtime capture:** initialized `@sentry/react-native` from Expo config and connected the app error boundary to crash reporting.
- [x] **Light theme leakage:** fixed dark-only app stack, glass cards, confirm dialogs, and memory drawer surfaces.
- [x] **Expo SDK health:** updated `expo-blur` and adjusted Metro config so `expo-doctor` passes.
- [x] **Chat parity pass:** added mobile share/export, low-message/cooldown banner, bounded ecosystem autonomous follow-up, and idle autonomous prompt continuation.
- [x] **Memory mutation parity:** added a web `/api/memories/[id]` mutation route and mobile paid-tier edit/save/delete controls that preserve embedding regeneration.
- [x] **Paid/free UX gating:** locked mobile wallpapers/custom names behind paid tiers, handled squad limits during downgrade/edit flows, and made Basic/Pro rate-limit copy plan-aware.
- [x] **Mobile plan management route:** mobile now opens the authenticated web customer portal route via Bearer auth instead of assuming Play Store subscription management.
- [x] **Auth and accessibility polish:** auth screens now use safe-area + keyboard-aware frames, core buttons/fields expose accessibility state, drawer/action buttons meet 44px touch targets, and reduced-motion settings are respected by looping animations.
- [x] **Mobile checkout auth:** mobile upgrades now call the web checkout API with the Supabase Bearer token and open the returned Dodo checkout URL, instead of opening the public pricing page without signed-in context.
- [x] **Settings destructive actions:** Start Fresh now deletes gang members through the user's gang ids instead of a nonexistent `gang_members.user_id`, and Delete Chat returns to a freshly hydrated chat screen.
- [x] **Reset password route guard:** the mobile route gate now allows the reset-password screen to finish after Supabase sets its temporary recovery session.
- [x] **Free-tier custom names:** onboarding and chat now respect the paid custom-name gate; old names are preserved but not displayed on Free.
- [x] **Chat history prepend polish:** loading older chat history no longer increments the unread/latest-message badge or forces bottom scrolling.
- [ ] **External setup not proven here:** Play Console products, Play Billing service account, Google Android OAuth signing registration, dedicated Sentry mobile project, Play Integrity, and push credentials require user-owned dashboards. EAS project linkage, the live `mobile_push_tokens` table, and signed preview builds are proven.
- [ ] **Physical-device regression verification required:** emulator verification covers install, startup, auth input focus, and the native Google account surface; a real account, chat turn, keyboard/composer behavior, push, and Play purchase still require a physical device/approved Play track.
- [x] **Production changes published:** the authorized release-candidate changes and backend billing verification are committed and pushed to `master`; web tests and production build pass.
- [x] **Upstash service replacement:** the deleted `hot-mullet-32833.upstash.io` database was replaced, the Vercel production variables were updated, and production was redeployed on 2026-07-18.
- [ ] **Web seeded Playwright blocked locally:** Chromium is installed, but seeded auth tests currently stop at the web auth wall because Cloudflare human verification cannot start in this local environment.
- [ ] **Docs drift:** master/phase plans still contain old unchecked tasks. Reconcile only after phone smoke testing confirms what is actually shippable.

## Parity Gaps Found So Far

- [x] Mobile auth uses native Android device-account selection with Supabase ID-token exchange, with `openAuthSessionAsync` retained for Expo Go/iOS.
- [x] Mobile now has bounded ecosystem autonomous follow-up and one idle continuation after a user turn.
- [x] Mobile now renders “while you were away” history rows with a divider instead of filtering them out.
- [x] Mobile now shows a low-message/cooldown banner and disables input during cooldown.
- [x] Mobile now shows failed/sending delivery state and retry controls for user messages.
- [x] Mobile chat history now supports loading older messages beyond the latest 50.
- [x] Mobile has native text share for the recent transcript and individual messages. Image screenshot capture is deferred until dev-client/native QA.
- [x] Mobile mirrors the web purchase celebration with reduced-motion-aware confetti and a one-time gang-generated upgrade greeting.
- [x] Mobile keeps the composer editable during an active turn, blocks only submission, explains repeated send attempts inline, bounds chat fetch/presentation time, and turns malformed or stalled responses into retryable failures.
- [x] Mobile memory vault supports paid-tier edit/save/delete, search, pagination, and inline retry/loading.
- [x] Mobile now has a drawer dark/light toggle wired through NativeWind theme variables and persisted to `profiles.theme`.

## Next Work Order

1. Register/confirm the Android OAuth client for package `ai.mygang.app` and the EAS/Play signing SHA-1 fingerprints.
2. Install from an approved Play internal-testing track and verify a real Google account, first chat reply, purchase/restore/upgrade/cancel/refund, and push delivery.
3. Complete the remaining external beta setup: dedicated mobile Sentry project, Play Integrity, and production push credentials.
