# Decision 0004: Mobile Uses Authenticated Web Checkout During Expo QA

**Date:** 2026-05-16
**Status:** Accepted

## Context

Native Play Billing is intentionally deferred until dev-client/preview-build verification, but the mobile pricing screen still needs a safe upgrade path that preserves the signed-in user.

## Decision

Mobile posts to the existing web `/api/checkout` route with the Supabase access token as a Bearer credential and opens the returned Dodo checkout URL. The web checkout route now accepts both cookie auth and Bearer auth via `createClientFromRequest`.

## Reasoning

Opening the public pricing page from mobile can lose the mobile session context. Reusing the authenticated web checkout route keeps the billing customer tied to the current account while avoiding native billing work before Play Billing is ready.

## Consequences

Expo/mobile QA can test paid upgrade entry without embedding billing secrets or relying on browser sign-in state. Final Play Billing purchase, restore, and Google verification remain separate release blockers.
