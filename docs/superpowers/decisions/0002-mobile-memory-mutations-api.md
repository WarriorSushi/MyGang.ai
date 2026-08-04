# Decision 0002: Mobile Memory Mutations Use Web API

**Date:** 2026-05-15
**Status:** Accepted

## Context
Mobile needed parity with the web Memory Vault edit/delete controls. Updating memories directly from the app would leave edited memory embeddings stale.

## Decision
Add `PATCH` and `DELETE` handlers at `/api/memories/[id]` and have mobile call that API for paid-tier memory edits/deletes.

## Reasoning
The web server already owns auth, rate limiting, tier enforcement, and embedding generation. Keeping mutation logic server-side avoids shipping privileged behavior into the mobile bundle and keeps memory retrieval quality intact after edits.

## Consequences
Mobile can show edit/save/delete controls for paid users. Free preview remains read-only. Any future memory mutation behavior should be added to the web API first, then consumed by mobile.
