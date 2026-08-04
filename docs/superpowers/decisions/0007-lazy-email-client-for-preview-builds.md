# Decision 0007: Create the Resend client lazily

**Date:** 2026-08-04
**Status:** Accepted

## Context

Vercel Preview builds do not have the production-only Resend key. Constructing the client at module import time made page-data collection fail even though email sending already treats a missing key as disabled.

## Decision

Create the Resend client inside email send calls and return early when the key is absent.

## Reasoning

This preserves production email behavior while allowing protected previews and local environments without email credentials to build safely.

## Consequences

Importing the email module no longer requires `RESEND_API_KEY`; actual sends still require it and remain no-ops when it is missing.
