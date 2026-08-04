# Mobile Release-Candidate Audit

**Date:** 2026-08-04  
**Scope:** `apps/mobile` compared with `apps/web`, the approved mobile spec, and Android release behavior

## Outcome

The native app already contains the core MyGang product and most user-facing web parity. This audit found no reason to redesign the product, but it did find several release-quality gaps hidden behind otherwise complete screens. The work below is ordered by user harm, not visual novelty.

## Findings

### Critical

1. **Android subscriptions still used web checkout.** The pricing screen contained release-placeholder copy while the native Play Billing and verification scaffolding sat unused. This violates the intended Android purchase architecture and would be unsuitable for Play distribution.
2. **A failed profile read looked like a new account.** A valid signed-in user could be routed into onboarding when Supabase profile loading failed or timed out because `null` represented both “no row” and “network failure.”

### High

3. **No offline state or durable composer draft.** A user could type while a request was active, but navigation, process death, or connectivity loss could discard the next message without a clear offline explanation.
4. **Chat history reads had no deadline.** A stalled Supabase request could leave hydration unfinished indefinitely.
5. **Web ecosystem pacing was missing.** Fast, Normal, and Relaxed pacing existed on web but not mobile.
6. **Mobile had no executable test suite.** TypeScript and lint passed, but `test` only printed a placeholder.

### Medium

7. **Foreground chat could become stale across devices.** History refreshed manually but not when returning to the app.
8. **Reaction writes were optimistic without rollback.** A failed write left the UI claiming a reaction had been saved.
9. **URLs in messages were plain text.** Web messages exposed links; mobile messages did not.
10. **Concurrent auth methods were insufficiently locked.** Password and Google actions could overlap during rapid input.
11. **Responsive limits were inconsistent.** Several phone-first layouts could become excessively wide on tablets, and the chat header could crowd narrow devices.
12. **Accessibility metadata was incomplete.** The main chat controls met the 44-point target, but selectable cards and disclosure controls were not consistently announced as selected/expanded.

## Verified parity already present

| Product area | Mobile implementation |
|---|---|
| Authentication | Email/password, Google OAuth account chooser, reset/recovery, persisted session |
| Onboarding | Welcome, profile, avatar pack, vibe quiz, gang selection, retake |
| Chat | Persistent history, pagination, delivery/retry, reply, reactions, copy/share, typing, modes, cooldown/paywall states, autonomous follow-up |
| Gang | Tier-aware editing, custom names, avatar packs, character details |
| Memory | Search, pagination, edit/delete, paid gating, reset flows |
| Personalization | Theme, wallpaper, names, avatar style |
| Account | Email/password changes, sign out, chat/memory reset, account deletion, legal links |
| Notifications | Permission, token registration, foreground handling, tap routing |
| Monetization | Plans, authenticated portal, purchase celebration; native Android purchase/restore required repair |
| Reliability | Sentry boundary, local chat cache, API timeout/retry; offline/profile/history gaps required repair |

## Remediation completed

- Replaced Android web checkout with native Google Play purchase, restore, pending-purchase, acknowledgement, upgrade-proration, and server verification flows.
- Separated “profile missing” from “profile request failed,” added a recoverable account screen, and prevented network failures from routing existing users into onboarding.
- Added per-user composer drafts, explicit offline state, bounded history reads, foreground refresh, reaction rollback, clickable message links, and the web app's Fast/Normal/Relaxed ecosystem pacing.
- Kept the composer editable while a turn is sending and limited only the send action, with transient inline guidance for repeated send attempts.
- Replaced Android browser OAuth with native device-account selection and Supabase ID-token exchange. Browser OAuth remains the Expo Go/iOS fallback.
- Added responsive width limits, narrow-header behavior, reduced-motion handling, selection/expansion semantics, and 44-point interaction targets across the audited surfaces.
- Added an executable mobile test suite and passed mobile typecheck, lint, tests, Expo Doctor (18/18), Android export, the web fast suite (22 files), and the web production build.

## External proof still required

- Google Play products, tester eligibility, service-account permissions, and purchase/cancel/refund behavior must be exercised from an approved Play testing track. A sideloaded APK cannot prove store ownership or product visibility.
- Native Google sign-in requires an Android OAuth client for `ai.mygang.app` with EAS signing SHA-1 `34:EA:F2:BA:2D:6B:04:D7:3F:AC:F2:FB:FD:49:0B:B5:01:F8:6A:E6`; final token exchange still needs a real device account test.
- Background push delivery still needs configured Firebase/EAS credentials and a physical-device test.
- Play Integrity remains a store/backend rollout task requiring Play Console and Google Cloud configuration.
- A dedicated mobile Sentry project is still preferable before broad production rollout.

## Release evidence

- Final preview APK: EAS build `85fc9cc9-d4f9-4b6d-82dd-27aef9f80054`, commit `b42e0e5c353c7ed859ffc55c064f860860c0fb62`.
- Installed on the Android emulator as `ai.mygang.app` version `0.1.0` (`versionCode 1`); launch completed with no fatal Android/React Native exception.
- Tapping Continue with Google opened Google Play services' native device-account flow and returned safely to MyGang on cancellation; it did not open the browser or website.
- Production smoke check: `https://www.mygang.ai` returned 200 and the unauthenticated Android billing verifier returned the expected 401.
