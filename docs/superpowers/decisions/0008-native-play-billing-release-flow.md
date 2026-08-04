# Decision 0008: Native Play Billing for Android Releases

**Date:** 2026-08-04  
**Status:** Accepted; supersedes the release behavior in 0001 and 0004

## Context

Expo Go cannot load the native billing module, so early mobile QA intentionally used authenticated web checkout. The release-candidate app now needs the Android digital-goods flow required by the product spec and Google Play.

## Decision

Load the `expo-iap` bridge lazily outside Expo Go. Standalone Android builds use Google Play for localized product details, purchase, tier replacement, restore, server verification, entitlement, and acknowledgement. Expo Go retains authenticated web checkout strictly as a development-only fallback.

The backend verifies with `purchases.subscriptionsv2.get`, checks state, product, expiry, and the obfuscated MyGang account ID, stores entitlement, then acknowledges the purchase. If server acknowledgement fails, the client performs the acknowledgement after successful verification.

## Reasoning

Lazy loading preserves Expo Go usability without shipping a policy-incompatible web purchase path in the standalone Android app. Verification and account binding on the server prevent the client from granting its own tier or applying another account's purchase token.

## Consequences

- Preview and production native builds require Play Console products and tester eligibility before products appear.
- A sideloaded APK can exercise the app but cannot prove Play product visibility or a licensed store purchase.
- The approved Play testing track must still cover pending, upgrade, restore, cancel, refund, grace-period, and expiry transitions.
- Real-time Developer Notifications remain required before broad production rollout so renewals and out-of-app lifecycle changes update Supabase while the app is closed.

