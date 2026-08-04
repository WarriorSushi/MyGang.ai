# Mobile Parity and Chat Reliability Audit

**Date:** 2026-07-18
**Compared:** `apps/mobile` against the product surface in `apps/web` and the approved mobile spec

## Executive summary

The mobile app already implements the main product: email/password and Google auth, onboarding, squad management, persistent multi-character chat, history pagination, replies/reactions/retry/share, autonomous mode, settings, themes, paid personalization gates, Memory Vault mutations, checkout/portal routing, push registration, and account deletion. The older master plan substantially understates the current implementation.

This pass fixed the only current P0 chat failure and the remaining code-level celebration gap. No new production secret or schema change was needed.

## Fixed in this pass

- **P0 — indefinite `Sending...`:** the mobile fetch now has a 35-second full-response deadline, validates successful response shape, and converts timeouts/network/malformed responses into an inline retry state.
- **P0 — unusable composer:** the text field stays editable while a turn is active. Only submission is serialized.
- **P1 — unclear repeated taps:** tapping Send during an active turn shows `Wait for the previous message to send.` for 2.2 seconds and then removes it automatically.
- **P1 — unbounded presentation lock:** individual AI delays and the complete rendered turn now have hard caps.
- **P1 — delivery clarity:** the pending user bubble and Send control are gray until accepted; errors preserve the next draft and expose Retry.
- **P1 — upgrade parity:** Basic/Pro upgrades now trigger reduced-motion-aware mobile confetti and the same one-time gang-generated celebration used by web.

## Verified parity

| Area | Mobile status |
|---|---|
| Auth and recovery | Implemented, including Google chooser/HTTPS app relay and persistent Supabase sessions |
| Onboarding and squad editing | Implemented, including retake and tier squad limits |
| Core chat | Implemented, including persistent history, pagination, reply, reaction, retry, text sharing, delivery state, modes, cooldown UI, and autonomous follow-up |
| Memory Vault | Implemented with search, pagination, paid edit/delete, and embedding-safe server mutations |
| Settings/account | Implemented with profile, theme, wallpaper, custom names, notifications, reset/delete data, and billing portal |
| Billing entry | Authenticated web checkout/portal is implemented for preview QA |
| Push plumbing | Client registration and server route exist; live `mobile_push_tokens` REST access returned 200 |
| Monitoring | Sentry initializes and the app error boundary reports crashes |

## Remaining release blockers that require external setup or device proof

- Native Google Play Billing is scaffolded but the current pricing screen intentionally uses authenticated web checkout. Play Console products, service-account access, sandbox purchase/restore/cancel/refund tests, and the production app track must be configured before Store release.
- Play Integrity verification is not wired. It needs Play Console/Google Cloud configuration plus a native-build and server verification pass.
- Push credentials and real background notification delivery still require Firebase/EAS dashboard setup and a physical-device test. The database table and registration code are present.
- Mobile currently shares the web Sentry project. A dedicated mobile project/DSN remains a beta-operations task.
- Native text sharing works; image/screenshot sharing remains a lower-priority native QA item.
- Google OAuth, keyboard movement, the repaired send lifecycle, and the final APK still need a focused physical Android regression test.

## Verification evidence

- Mobile TypeScript: pass
- Mobile Expo lint: pass
- Expo Doctor: 18/18 checks pass
- Web fast tests: pass
- Web production build: pass
- Live `https://www.mygang.ai/api/chat`: reachable and returns the expected 401 JSON without auth
- Live Supabase Auth health: 200; `mobile_push_tokens` REST probe: 200; project is not paused
- Seeded Playwright: local run timed out in the protected authentication flow because Cloudflare human verification cannot start in headless local automation
