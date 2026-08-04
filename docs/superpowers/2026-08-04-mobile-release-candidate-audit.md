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

## External proof still required

- Google Play products, tester eligibility, service-account permissions, and purchase/cancel/refund behavior must be exercised from an approved Play testing track. A sideloaded APK cannot prove store ownership or product visibility.
- Background push delivery still needs configured Firebase/EAS credentials and a physical-device test.
- Play Integrity remains a store/backend rollout task requiring Play Console and Google Cloud configuration.
- A dedicated mobile Sentry project is still preferable before broad production rollout.

