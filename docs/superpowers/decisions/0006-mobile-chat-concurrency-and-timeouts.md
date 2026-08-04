# Decision 0006: Keep Drafting Separate From Sending

**Date:** 2026-07-18
**Status:** Accepted

## Context
An authenticated mobile chat request could remain in `sending` forever because the client had no full-response timeout. The same state disabled the entire text field until every simulated reply delay finished.

## Decision
Keep the text composer editable while a turn is active, lock only submission, show a short inline explanation on repeated send attempts, and bound both the network response and AI-event presentation windows.

## Reasoning
Drafting the next thought is safe and should not depend on network speed. Serializing actual sends preserves message order, while explicit timeouts guarantee every optimistic message reaches either `sent` or a retryable `failed` state.

## Consequences
The send button remains gray and busy until the current turn completes, pending user bubbles are gray, malformed/stalled responses fail cleanly, and server-provided event delays cannot lock the chat indefinitely.
