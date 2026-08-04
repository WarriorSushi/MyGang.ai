# Decision 0011: Deterministic free-tier memory quality

**Date:** 2026-08-04
**Status:** Accepted

## Context

Free-tier memory writes intentionally skip embeddings, so semantic deduplication did not protect scarce memory slots from near-duplicate or conversation-meta entries.

## Decision

Apply a deterministic content-quality gate and lexical similarity check before storage on every tier. Preserve explicit naming preferences and importance-based correction replacement; keep embedding similarity as an additional paid-tier layer.

## Reasoning

The lexical gate is cheap, testable, and available during provider or embedding outages. It prevents chat mechanics such as “User asked for introductions” from becoming long-term facts without weakening durable personal memories.

## Consequences

New low-value entries are rejected and near-duplicates no longer consume free-tier slots. Existing duplicate rows remain user-editable and are not destructively rewritten.
