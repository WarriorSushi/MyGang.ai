# Decision 0010: Responsive chat bubble caps

**Date:** 2026-08-04
**Status:** Accepted

## Context

Inline `maxWidth: 560` styles overrode percentage utility classes and allowed mobile chat bubbles to reach beyond narrow screens.

## Decision

Calculate user and assistant bubble caps once in the virtualized message list from the current viewport: 80% for user bubbles, 78% for assistant bubbles, both capped at 560dp.

## Reasoning

Numeric React Native styles are deterministic across NativeWind and inline-style precedence, while computing them at the list level avoids a viewport subscription in every message row.

## Consequences

Phone bubbles remain inside the viewport, tablet bubbles retain readable line lengths, and rotations trigger one list-level recalculation.
