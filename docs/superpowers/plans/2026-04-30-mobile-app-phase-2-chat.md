# Phase 2 — Core Chat Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL — Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Codex agents:** the workflow is the same — pick the next unchecked checkbox, do that step, check it off. The skill names are Claude Code shortcuts; the workflow underneath them is universal.

**Goal:** A signed-in user opens the mobile app and lands on a working group chat with their selected gang. Messages flow through the existing `/api/chat` endpoint, AI responses stream in, multiple characters can speak per turn, history persists across sessions, and Supabase Realtime keeps cross-device state in sync.

**Architecture:** Mobile chat consumes `apps/web/src/app/api/chat/route.ts` over HTTPS — no new server code. The streaming response is parsed identically to web (the `useChat`-style event loop in `apps/web/src/hooks/use-chat-api.ts` is the reference). State management mirrors web's Zustand `chat-store`. Avatars come from `https://mygang.ai/avatars/...`. Realtime via `@supabase/supabase-js` channels.

**Tech Stack:** All Phase 0/1 stack + `@shopify/flash-list` (efficient virtualized message list) + Vercel `ai` SDK for streaming (already installed transitively) + new mobile chat screens. May need `react-native-svg`, `expo-clipboard` (for copy actions).

**Estimated effort (if done in full parity with web):** ~4-6 weeks calendar. Web chat is 5,200 LOC across 9 components + 1,000 LOC hook + 792 LOC page = ~7,000 LOC to mirror. **This plan is paced over multiple work sessions; not all tasks are achievable in one session.**

**Spec reference:** `docs/superpowers/specs/2026-04-29-mobile-app-design.md` §3.3 + Phase 2 outline.

---

## Pre-flight

- [ ] **Pre-flight 1: Phase 1 is complete.** Branch `mobile-app-init`, latest commit at top. Web baseline 52 pass / 2 fail.
- [ ] **Pre-flight 2: User is onboarded** in Supabase (their `profiles.onboarding_completed = true`, `preferred_squad` populated). Without this, the route gate sends them to onboarding and chat never renders.
- [ ] **Pre-flight 3: `/api/chat` is reachable from mobile network.** Same DNS/network constraints as Phase 1 auth (Cloudflare 1.1.1.1 DNS or any working DNS).

---

## Task 2.0 — Lift core chat utilities to `@mygang/shared`

**Goal:** All non-UI chat code (message types, prompt builders, history formatting, streaming response parser) lives in shared so mobile and web compute the same shapes from the same source.

**Files to lift:**
- `apps/web/src/lib/chat-utils.ts` → `packages/shared/src/chat/utils.ts`
- `apps/web/src/lib/ai/system-prompt.ts` → `packages/shared/src/prompts/system.ts`
- `apps/web/src/lib/ai/character-prompt.ts` → `packages/shared/src/prompts/character.ts`
- `apps/web/src/lib/ai/response-style.ts` → `packages/shared/src/prompts/response-style.ts`
- `apps/web/src/lib/ai/history-format.ts` → `packages/shared/src/chat/history-format.ts`
- `apps/web/src/constants/character-greetings.ts` → `packages/shared/src/characters/greetings.ts`
- `apps/web/src/constants/character-messages.ts` → `packages/shared/src/characters/messages.ts`
- `apps/web/src/lib/chat-arrival.ts` → `packages/shared/src/chat/arrival.ts` (if mobile needs it; check)
- Message types from `apps/web/src/stores/chat-store.ts` → `packages/shared/src/chat/types.ts`

For each:
- [ ] Read web file
- [ ] Verify it's pure (no Next.js / server-only imports)
- [ ] If pure: `git mv` to shared, fix internal imports, update web import sites
- [ ] If impure: extract the pure parts to shared, leave server-specific code in web
- [ ] Verify web build + tests still clean

---

## Task 2.1 — Mobile chat client (the streaming response parser)

**Goal:** A mobile-callable function that takes a chat payload and yields events as they stream from `/api/chat`. Mirrors `apps/web/src/hooks/use-chat-api.ts`'s event loop without all the typing-simulation orchestration.

**Files:**
- Create: `apps/mobile/lib/chat-api.ts`

**Behavior:**
- POST to `https://mygang.ai/api/chat` (or env-configurable URL) with `Authorization: Bearer <supabase access token>`
- Read response stream, parse SSE / NDJSON / whatever format the route returns
- Yield `{ type: 'message' | 'reaction' | 'typing' | 'status', ... }` events
- Caller (chat screen) consumes and updates UI

**Steps:**
- [ ] Read the chat API route's response shape (`apps/web/src/app/api/chat/route.ts`)
- [ ] Build a typed `ChatRequest` and `ChatEvent` model in shared if not already
- [ ] Implement `streamChatResponse(payload)` async generator in `chat-api.ts`
- [ ] Handle 4xx (paywall, cooldown) gracefully
- [ ] Handle network errors with retry + user-visible error

---

## Task 2.2 — Chat screen skeleton (no streaming yet)

**Goal:** A new route `apps/mobile/app/(app)/chat.tsx` that loads the user's gang from Supabase, renders a static list of placeholder messages, and has a composer at the bottom. Wired to navigation but not yet to live chat.

**Files:**
- Create: `apps/mobile/app/(app)/chat.tsx`
- Create: `apps/mobile/components/chat/message-item.tsx`
- Create: `apps/mobile/components/chat/message-list.tsx`
- Create: `apps/mobile/components/chat/chat-input.tsx`
- Create: `apps/mobile/components/chat/chat-header.tsx`
- Modify: `apps/mobile/app/(app)/index.tsx` (the home now redirects to chat or shows it inline)

**Steps:**
- [ ] Read web's `apps/web/src/app/chat/page.tsx` to understand state shape
- [ ] Build `chat-header.tsx` — shows gang avatars + dropdown for actions
- [ ] Build `message-list.tsx` — FlashList with virtualized rendering
- [ ] Build `message-item.tsx` — bubble with avatar, name, content, timestamp
- [ ] Build `chat-input.tsx` — composer with send button, disabled while AI responds
- [ ] Build `chat.tsx` orchestrator — loads gang, renders the above

---

## Task 2.3 — Wire AI streaming end-to-end

**Goal:** Tap "send" → message appears immediately → typing indicator → AI response streams in word-by-word → settles into final message.

**Files:**
- Modify: `apps/mobile/app/(app)/chat.tsx`
- Modify: `apps/mobile/lib/chat-api.ts`

**Steps:**
- [ ] On send: optimistically add user message to local state
- [ ] Call `streamChatResponse` with full payload (user message, gang, history)
- [ ] As events arrive, update the message list (typing → message → typing → message)
- [ ] On error: show toast, mark user message as `failed`, allow retry
- [ ] Save messages to local AsyncStorage on completion

---

## Task 2.4 — Persist chat history with Supabase

**Goal:** Messages persist across app restarts AND sync across devices via Supabase Realtime.

**Files:**
- Modify: `apps/mobile/app/(app)/chat.tsx`
- Create: `apps/mobile/lib/chat-history.ts`

**Steps:**
- [ ] On mount: fetch most-recent N messages from Supabase `messages` table for this user
- [ ] Subscribe to Realtime channel for new messages from this user (cross-device sync)
- [ ] Save user messages + AI replies to Supabase as they arrive
- [ ] Infinite scroll: load older history when scrolled to top

---

## Task 2.5 — Match web chat polish (defer-able)

These items make mobile feel like web. Each is its own sub-task; defer to follow-up sessions if time runs out.

- [ ] Typing indicators with the right character's avatar
- [ ] Multi-character interleaving (multiple characters reply per user turn)
- [ ] Message actions (long-press → copy / retry / delete)
- [ ] Reactions on messages
- [ ] Avatar lightbox (tap an avatar to see big version)
- [ ] Settings panel mirror of web's chat-settings.tsx
- [ ] Memory vault mirror of web's memory-vault.tsx
- [ ] AI disclaimer banner
- [ ] Capacity manager / paywall integration for free users hitting message limits
- [ ] Custom character name display (use the customCharacterNames the user set during onboarding)

---

## Task 2.6 — Update home + route gate to send onboarded users to chat

**Files:**
- Modify: `apps/mobile/app/(app)/index.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Steps:**
- [ ] After onboarding completes, route to `(app)/chat` instead of `(app)`
- [ ] Update home / index to either redirect to chat or be the chat itself

---

## Self-review

(filled in when this plan reaches completion)

---

## Change log

| Date | Change | Author |
|---|---|---|
| 2026-04-30 | Initial Phase 2 plan written during overnight autonomous session. Scope intentionally large (matches the 4-6 week effort estimate); first wave of execution starts immediately with Tasks 2.0-2.3, with 2.4-2.6 deferred. | Claude Opus 4.7 |
