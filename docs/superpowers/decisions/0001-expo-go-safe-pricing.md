# Decision 0001: Expo Go Safe Pricing

**Date:** 2026-05-14
**Status:** Accepted

## Context

The Android app is being tested through Expo Go, and reloads can fail if a route imports a native module that Expo Go cannot provide. The pricing screen imported `expo-iap` at module scope, while billing QA is explicitly deferred until the end of the mobile stabilization pass.

## Decision

For Expo Go testing, the mobile pricing screen opens the existing web pricing page instead of importing and starting Google Play Billing directly from the route.

## Reasoning

This keeps chat, onboarding, settings, and parity testing unblocked on a real phone. Google Play Billing should be restored and verified from an EAS development/preview build, where the native purchase module is actually present.

## Consequences

Pricing is intentionally a web checkout fallback during Expo Go testing. Before release, the Play Billing flow in `apps/mobile/lib/billing.ts` must be reconnected from a dev-client or preview build and verified against Play Console sandbox products.
