# Decision 0003: Mobile Uses Authenticated Web Billing Portal

**Date:** 2026-05-15
**Status:** Accepted

## Context

Mobile billing is not ready for final Play Billing verification yet, but paid users still need a safe way to manage existing subscriptions from the app during Expo/device QA.

## Decision

Mobile opens the existing web `/api/customer-portal` route with the Supabase access token as a Bearer credential. The web route accepts request-scoped auth and redirects to the Dodo customer portal when available, with a pricing fallback.

## Reasoning

This avoids hard-coding Play Store subscription links before native billing is verified and reuses the production web billing source of truth. It also keeps subscription management out of the Expo Go/native-IAP uncertainty zone.

## Consequences

The mobile app depends on the web customer-portal route supporting Bearer auth. Final Play Billing purchase, restore, and Android verification side effects remain separate beta blockers.
