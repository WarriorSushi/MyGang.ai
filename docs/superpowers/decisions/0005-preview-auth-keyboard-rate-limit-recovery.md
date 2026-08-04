# Decision 0005: Recover Mobile Auth, Keyboard, and Rate Limiting

**Date:** 2026-07-18
**Status:** Accepted

## Context
The first Android preview exposed three release blockers: Supabase OAuth fell back to the web landing page, the edge-to-edge chat composer stayed behind the keyboard, and a dead Upstash hostname was reported as an exhausted free-tier quota.

## Decision
Relay Supabase's session hash from the trusted MyGang Site URL into the app scheme, request Google's account chooser, use `react-native-keyboard-controller` for the chat composer, and retain a bounded per-server limiter when a configured Redis service is temporarily unreachable.

## Reasoning
The HTTPS relay removes the unproven custom-scheme allowlist dependency while keeping tokens inside Supabase's normal redirect flow. Keyboard Controller is Expo's recommended consistent option for chat-style Android keyboard movement. A local limiter during an upstream outage keeps basic abuse protection active without falsely locking every user out as if they had spent their quota.

## Consequences
The web landing page now participates in mobile OAuth/recovery callbacks, mobile preview builds include a new native keyboard module, and Redis outages remain loudly logged but no longer generate fake quota failures. The Upstash endpoint still needs replacement for durable cross-instance limits.
