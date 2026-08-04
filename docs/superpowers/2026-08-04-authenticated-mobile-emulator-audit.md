# Authenticated mobile emulator audit — 2026-08-04

**Device:** Android emulator, 1080×2400 at 420 dpi (about 411×914 dp)

**Account:** Existing authenticated test account (credentials intentionally not recorded)

**Scope:** Chat, active-send behavior, offline failure, settings, light/dark themes, Memory Vault, and Edit Gang

## What is already working

- The composer stays editable while a message is sending, preserves the next draft, dims the send affordance, and shows a temporary wait notice on repeated taps.
- Email/password auth and persisted login work on the emulator.
- Settings, Memory Vault, and Edit Gang are usable in both dark and light themes with clear plan states.
- AI turns respected a request for natural, non-repetitive introductions in the tested turn.

## Findings and priorities

### High — message bubbles overflow narrow screens

Assistant rows declare a percentage width in NativeWind but override it with an inline `maxWidth: 560`. On the 411 dp emulator, UI Automator measured assistant content reaching the 1080 px screen boundary, clipping Luna's and Atlas's messages. User bubbles also expand to almost the full viewport instead of the intended 80%.

**Fix:** Calculate a numeric cap from the current window width, retain the 560 dp tablet ceiling, and regression-test phone/tablet widths.

### High — network loss is detected too late

After removing the emulator's active network, the composer remained send-enabled. The request failed only after submission and produced a platform alert with the raw text `Network request failed`. The failed bubble and retry affordance are recoverable, but the early state and copy are not calm or actionable.

**Fix:** Reconcile Expo's subscription with an explicit lightweight network-state check, show the existing offline draft state earlier, and replace the raw transport alert with inline retry guidance.

### Medium — low-value and duplicate memories consume the vault

The vault contains both “User asked for introductions.” and “User asked for introductions, and the gang responded.” These describe chat mechanics rather than a durable fact about the user, consume scarce free-tier memory slots, and can degrade recall. Free-tier storage skips embeddings, while current lexical conflict handling only applies to higher-importance entries.

**Fix:** Add a deterministic quality gate for conversation-meta memories and apply lexical deduplication to active memories for every tier, while preserving correction semantics.

### Medium — the gang can use a stale name

The current profile UI displays `irfan1`, but fresh replies addressed the user as “Claude.” The current profile name is already sent to the API; older history or memory can still win in generation.

**Fix:** Make the current profile name (or explicit nickname) authoritative in the system prompt and treat other names as stale unless the latest user turn changes it.

### Low — timestamp and row rhythm are noisy

Each message displays both a clock time and a relative label. The relative label is memoized and remains “just now” long after it is false. Always-visible 44 dp action controls also create a large gap between short messages.

**Fix:** Keep the stable clock time only and tighten the visible action row while retaining accessible hit targets.

### Low — remote avatars have an empty loading moment

Character artwork eventually loaded successfully, but slow remote images briefly look like a blank/black card. The existing character-color background prevents layout shift; a later image-loading treatment can improve perceived polish without blocking this release.

## Anti-pattern verdict

The app's teal glass, character color, and intimate wallpaper system are distinctive and aligned with the product. The most template-like area is the repeated metadata/action chrome under every message; reducing stale timestamp copy and visible control height improves conversational focus without changing the established visual language.
