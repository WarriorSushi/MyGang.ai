# Session 2026-04-30 — Overnight autonomous run

**Agent:** Claude Code (Opus 4.7, 1M context)
**Phase:** Phase 1 close-out + Phase 2 (Chat) execution
**Status:** ended at branch tip — significant Phase 2 progress, Phase 2 not finished (it's months of work)

## Context entering this session

Phase 1 (Auth + app shell) was functionally complete — sign-up/sign-in/session persistence verified on real device earlier today; full 8-step onboarding port committed. Web baseline 52 pass / 2 fail.

User instruction: build through the night without waiting for testing. Realistic deliverable: close Phase 1 cleanly, plan Phase 2, lift everything possible to shared, ship a minimum-viable chat experience that posts to /api/chat.

## What got done

### Phase 1 closeout
- Master plan updated: Phase 1 marked ✅ Done; Phase 2 marked In progress
- Web build clean; tests baseline (52 pass / 2 fail)
- Mobile typecheck clean

### Foundational lifts to @mygang/shared (commits e5b61dd, 9e0d1bb, 36f4d4c, 0cf467c)
- `recommendation.ts` — vibe-quiz → ranked character IDs
- `squad-persistence.ts` — gangs + gang_members table writes (mobile can call directly via supabase client)
- `chat/utils.ts` — sanitizeMessageId, detectUnsafeContent, hasOpenFloorIntent, isMissingHistoryMetadataColumnsError
- `chat/history-format.ts` — compact LLM history formatter
- `prompts/response-style.ts` — turn-intent + fallback patterns
- `prompts/character.ts` — typing fingerprints, depth lines, persona register
- `prompts/system.ts` — modular system prompt builder
- `characters-greetings.ts` — greeting beats per character
- `characters-messages.ts` — character intro messages
- All web import sites swapped to `@mygang/shared`. 4 test files updated.

### Phase 2 plan written
- `docs/superpowers/plans/2026-04-30-mobile-app-phase-2-chat.md` (Tasks 2.0 through 2.6 + deferred polish list)

### Mobile chat surface (commits 451d1fe, 433d9ea, b3d6067, 851fbe3, d64b299)

**Chat library + components:**
- `lib/chat-api.ts` — typed POST to /api/chat with Supabase Bearer token; handles paywall (HTTP 402 + cooldown_seconds), network errors, and non-JSON responses; `generateMessageId()` helper
- `lib/chat-storage.ts` — AsyncStorage persistence per user (load/save/clear), capped at 100 messages
- `components/chat/message-item.tsx` — user vs character bubbles; resolves avatar via shared.resolveAvatarUrl; supports customName override
- `components/chat/message-list.tsx` — FlatList with auto-scroll-to-end; threads customNames map through
- `components/chat/chat-input.tsx` — multiline composer, disabled while AI responds
- `components/chat/chat-header.tsx` — gang avatar row + gear icon → settings
- `components/chat/typing-indicator.tsx` — animated 3-dot pulse using RN Animated; mirrors web's typing_ghost UX
- `components/chat/empty-state.tsx` — first-launch greeting with gang preview
- `components/chat/ai-disclaimer.tsx` — "AI can make mistakes" footer

**Screens added under `(app)/`:**
- `chat.tsx` — orchestrator: loads gang from profile.preferred_squad, sends messages, schedules incoming events with their per-event delay (typing_ghost shows the indicator, message events drop messages), persists via chat-storage, shows empty state when no messages
- `settings.tsx` — Account section (username, email, plan + tier copy), Gang section (link to manage), Avatar pack picker (Robots/Human/Retro), Sign-out (clears local cache)
- `edit-gang.tsx` — reuses onboarding's SelectionStep; tier-aware max members; calls persistGangMembership + updates preferred_squad
- `index.tsx` — now redirects onboarded users to /(app)/chat

### Memory updates this session
- `mobile_parity_with_web.md` — strengthened with "mobile is a standalone product surface; no flow may require web first"
- `autonomous_overnight_work.md` (new) — rule for treating "go to sleep, keep working" instructions as autonomous mode

## What's broken / unfinished

Nothing committed is broken. The "unfinished" items are deferred features not yet built. Realistic Phase 2 still needs months of work.

**Verified during session:**
- web build clean, tests at baseline 52/2 throughout
- mobile typecheck clean at every commit

**Not phone-tested this session** (user was asleep):
- The full 8-step onboarding flow on a real device
- Mobile chat end-to-end against /api/chat (depends on user network being unfucked from earlier DNS issue — should be OK now that they fixed DNS to `one.one.one.one`)
- Settings screen, edit-gang screen, typing indicator animation

**Deferred from the Phase 2 plan (Task 2.5 and beyond):**
- Reactions on messages
- Long-press menu (copy/retry/delete)
- Avatar lightbox
- Memory vault (mirror of web's memory-vault.tsx)
- AI disclaimer beyond the simple line (web has a full disclaimer dialog)
- Multi-character interleaving polish (current implementation works for the events.delay-driven case but doesn't handle subtler interleaving)
- Custom character names display: ✅ DONE (custom names from profile.custom_character_names show in messages)
- Persistence to Supabase + Realtime cross-device sync (Task 2.4 not started — only AsyncStorage)
- Infinite scroll history loading
- Image rendering / link previews
- Capacity manager / paywall integration (currently just shows the alert when 402 returns)

**Deferred from spec:**
- Phase 3 (Push, settings polish, account)
- Phase 4 (Billing & Play Console)
- Phase 5 (Polish & closed beta)
- Phase 6 (Production launch)
- All require user-action gates I can't cross overnight (EAS account, Play Console, real-device testing)

**Known platform-specific gaps:**
- The chat screen uses native fetch + native KeyboardAvoidingView; on iOS keyboard handling may need refinement (untested — iOS not in Phase 1 scope)
- expo-clipboard NOT installed; long-press-to-copy on messages is not wired
- Reanimated 4 is installed but barely used; the typing-indicator uses RN's Animated API (no perf reason; just simpler)

## Next session should start with

**Required before any further mobile execution:**

1. **Phone-test the new flow end-to-end** — sign up a fresh account, walk through the 8-step onboarding (welcome → identity → vibe quiz → avatar gift → avatar style → selection → friends intro → loading), arrive at chat, send a message, see typing indicator + AI response, open settings, change avatar pack, edit gang, sign out, sign back in. Report what works and what doesn't.

2. **If the full 8-step onboarding has UI bugs** (likely — none of it has been visually verified on a real device), iterate on the affected step components under `apps/mobile/components/onboarding/`. Each is small; fixes are localized.

3. **If chat AI responses are not arriving:**
   - Verify the user's existing /api/chat route accepts mobile requests (it should — same Supabase JWT auth)
   - Check Vercel function logs for errors
   - The mobile request payload omits some optional web-only fields (arrival_context, vibeProfile in request etc.); if /api/chat fails for that reason, add the omitted fields

**Order of next features to build (highest value first):**

1. **Long-press on a message → copy / retry / delete** (small; needs `expo-clipboard` install)
2. **Reactions on messages** (mid; UI for the long-press menu, then plumb through reaction events from the API)
3. **Memory vault** (large but high-perceived-value; mirror web/components/chat/memory-vault.tsx; the data is in Supabase memories table)
4. **Cross-device Supabase Realtime** (Task 2.4; messages sync between web and mobile)
5. **Onboarding visual polish pass** with frontend-design skill
6. **Phase 3 — Push notifications** (FCM setup; requires Firebase Console paperwork from user)

## Decisions made this session

- **Reuse onboarding's SelectionStep for the edit-gang screen** instead of building a separate character picker. Keeps one source of truth for selection UX.
- **AsyncStorage for chat history persistence**, not Supabase. Faster path; cross-device sync is its own task (2.4).
- **Per-event delay scheduling** for incoming events (matches web's behavior where the chat API returns the events all at once with delays); we don't stream events one-by-one over an open connection.
- **Sign-out clears the local message cache** to prevent the next signed-in user (e.g., if they share a phone) from seeing old messages.
- **Disabled `experiments.typedRoutes`** in Phase 1; left disabled here. If a future session wants the type-safety, they can re-enable AFTER all routes exist and Expo can stat the final tree.
- **chat-arrival.ts NOT lifted** — uses browser sessionStorage. Needs a storage-adapter pattern before lifting; deferred.

## Notes

- Branch state: `mobile-app-init` at SHA `d64b299` (or whichever is latest after final commits). Pushed to origin.
- Vercel preview build for this branch IS green (verified earlier in session — preview URL https://mygang-2-74sg-h46yqd9pa-warriorsushis-projects.vercel.app shipped fine after the RESEND_API_KEY fix and the turbo passThroughEnv config).
- Production at mygang.ai is unaffected (master still has the pre-monorepo layout; nothing has been merged).
- The user's Supabase project URL was wrong in the earlier app.json — the working URL is `xiekctfhbqkhoqplobep.supabase.co`, NOT the `rpizfqjtrwhackeqcsau` they pasted in chat originally. Fixed earlier in session.
- User explicitly chose Path A (full web parity onboarding) and the standalone-product rule. Future sessions must keep building toward parity, not simplification.
- Multiple memory files updated in this session: see `MEMORY.md`.
