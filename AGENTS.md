# AGENTS.md — MyGang.ai

This file is the **canonical project context** for any AI coding agent working on this repository (Claude Code, Codex CLI, Aider, Cursor, Gemini CLI, etc.). Read this entire file before doing anything in this repo.

---

## 1. What this project is

**MyGang.ai** is an AI group-chat web app live at https://mygang.ai. Users build a "gang" of fictional characters (14 hand-crafted personas) that talk to the user *and to each other* with personality.

**Stack (web, today):**
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4
- Supabase (Postgres + auth + realtime)
- Vercel (hosting + functions)
- Vercel `ai` SDK with Google Generative AI + OpenRouter providers
- DodoPayments, Resend, Cloudflare Turnstile, Upstash Redis, Sentry
- pnpm + (newly) pnpm workspaces + Turborepo

**Current major initiative:** building a **native React Native + Expo mobile app** with full feature parity, in a monorepo alongside the existing web app. See the spec.

---

## 2. About the user

The user is a **vibe coder** — they do not write code by hand and are not deeply familiar with technical tradeoffs. They built the existing web app entirely through AI assistants in prior sessions.

**How to work with them:**
- **Make engineering decisions yourself.** Do not present multi-choice menus that require library/architecture knowledge to answer. State the decision, briefly explain why, move on.
- **Multi-choice IS appropriate** for product/scope/business questions ("should v1 include billing?", "do you want iOS too?") — answer those they can.
- **Teach in plain language as you go.** 1-3 sentence explanations of *why* a decision was made, connected to something concrete in their codebase. They learn from working with you.
- **Watch for confusion.** If they say "im confused" or "i dont know what to answer," it means you gave them a decision they shouldn't have been asked to make — back up, decide, explain.
- They are on **Windows 11**, with bash and PowerShell available. Email: Nrrdenterprises@gmail.com.

---

## 3. Where to find things

| What | Where |
|---|---|
| Master spec | `docs/superpowers/specs/2026-04-29-mobile-app-design.md` |
| Implementation plan (checkbox list) | `docs/superpowers/plans/2026-04-29-mobile-app-plan.md` |
| Session handoff logs | `docs/superpowers/sessions/` (one file per session, named `YYYY-MM-DD-session-NN.md`) |
| Decision notes | `docs/superpowers/decisions/` (one short markdown file per non-obvious choice) |
| Existing product docs | `design_docs/01_PRD.md`, `02_ARCHITECTURE.md`, `03_CHARACTERS.md`, `04_UI_COMPONENTS.md`, `05_PRODUCTION_CHECKLIST.md` |
| Older audit/feature plans | `docs/` (1milli-master-plan.md, audit-*.md, etc.) — historical reference, not active |
| Web source | `apps/web/` (after Phase 0; before Phase 0 it's at the repo root) |
| Mobile source | `apps/mobile/` (created in Phase 0) |
| Shared code (types, schemas, prompts, characters) | `packages/shared/` (created in Phase 0) |

---

## 4. Session-start ritual

When you (any agent) open a new session on this repo, follow this in order:

1. **Read `AGENTS.md`** (this file) — full project context.
2. **Read the master spec** at `docs/superpowers/specs/2026-04-29-mobile-app-design.md` — the *what* and *why*.
3. **Read the implementation plan** at `docs/superpowers/plans/2026-04-29-mobile-app-plan.md` — find the next unchecked task.
4. **Read the latest session log** in `docs/superpowers/sessions/` — understand where the previous session left off.
5. **Skim `docs/superpowers/decisions/`** if relevant decisions exist — avoid re-litigating settled choices.
6. **Then start work** on the next unchecked task in the plan.

If any of the above documents are missing, your first job is to ask the user before proceeding — do not invent context.

---

## 5. Session-end ritual

Before ending a work session, write a session log entry at `docs/superpowers/sessions/YYYY-MM-DD-session-NN.md`. Use this template:

```markdown
# Session YYYY-MM-DD #NN

**Agent:** Claude Code | Codex | Aider | (whichever)
**Phase:** Phase X — <name>
**Duration:** approx N hours

## What got done
- Task IDs / brief descriptions of completed work
- Files touched

## What's broken or unfinished
- Anything left in a half-state, anything failing, anything you couldn't figure out

## Next session should start with
- The single most important next action
- Any context the next agent needs that isn't obvious from the plan

## Decisions made this session
- Any non-obvious technical choice → also save as a separate file in `docs/superpowers/decisions/`

## Notes
- Anything else worth remembering: surprises, gotchas, links to docs you found useful
```

**Rules for session logs:**
- One file per session. Do not edit previous session logs.
- Keep it short (5-15 lines is normal). It is a handoff, not a diary.
- Update the implementation plan checkboxes too — that's the source of truth for "what's done." The session log is the source of truth for "what *happened*."

---

## 6. Decision notes

When you make a non-obvious choice (a library swap, an architectural pattern, a workaround for a specific issue), write a short markdown file at `docs/superpowers/decisions/NNNN-<topic>.md`:

```markdown
# Decision NNNN: <Title>

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded by NNNN

## Context
1-2 sentences on the situation.

## Decision
What was chosen.

## Reasoning
Why, briefly. The alternative(s) considered.

## Consequences
What changes because of this — what other code/docs need to know.
```

Number them sequentially: `0001-`, `0002-`, etc.

---

## 7. Hard rules

These are non-negotiable. Apply them even if the user asks you to break them — confirm explicitly first.

1. **Never write production secrets to the repo or to plaintext files on disk.** Real secrets live in Vercel env vars, the password manager, or `apps/<app>/.env.local` (gitignored). Never in `docs/`, never in commit messages, never in chat-readable files.
2. **Never ship sensitive secrets in the mobile app bundle.** The `.apk` is decompilable. Only public-by-design values (Supabase URL, anon key, Sentry DSN, Google OAuth client ID, FCM sender ID) may be embedded. Section 3.8 of the spec lists the allowed/forbidden table.
3. **Never claim a task is "done" without verifying it.** Run the build. Run the tests. Open the screen. If you can't verify, say so explicitly and leave the task unchecked.
4. **Never commit on behalf of the user without explicit permission.** They tell you when to commit.
5. **Never skip git hooks (`--no-verify`) or bypass signing without the user's explicit approval.**
6. **Don't introduce changes outside the current task's scope.** No drive-by refactoring. The codebase is a vibe-coder codebase; it has the warts the user accepted.
7. **The live web app must keep working through every change.** When you finish a task that touched `apps/web/`, run the existing Playwright suite. Mobile changes don't affect web; web changes shouldn't break mobile's API consumption.
8. **Don't add features the user didn't ask for.** No premature abstractions, no hypothetical-future error handling, no logging frameworks "for later."

---

## 8. Tech-stack quick reference

| Concern | Web | Mobile |
|---|---|---|
| Language | TypeScript | TypeScript |
| Framework | Next.js 16 | Expo SDK 54+ + React Native |
| Routing | Next App Router | Expo Router (file-based) |
| Styling | Tailwind v4 | NativeWind v4 |
| State | Zustand | Zustand |
| Validation | Zod | Zod (from `packages/shared`) |
| Auth + DB | Supabase | Supabase JS + AsyncStorage adapter |
| Realtime | Supabase Realtime | Supabase Realtime |
| AI streaming | Vercel `ai` SDK | Vercel `ai` SDK + `useChat` |
| Animations | Framer Motion | Reanimated 3 |
| Forms | Radix + custom | `react-hook-form` + Zod resolver |
| Server-state cache | (Next caching) | TanStack Query |
| Push | `web-push` | `expo-notifications` + FCM |
| Payments | DodoPayments | `react-native-iap` + Play Billing |
| Anti-abuse | Cloudflare Turnstile | Play Integrity API |
| Errors | `@sentry/nextjs` | `@sentry/react-native` |
| Build | Vercel | EAS Build |
| OTA | n/a | EAS Update |

---

## 9. Workflow conventions (agent-neutral)

Different agents have different shortcut commands. Translate the canonical step → your tool's equivalent:

| Step | Claude Code | Codex CLI | Aider / others |
|---|---|---|---|
| Brainstorm a new feature | `superpowers:brainstorming` skill | manual: ask the user clarifying questions one at a time, then propose options | manual |
| Write a plan | `superpowers:writing-plans` skill | manual: write a checkbox-style plan to `docs/superpowers/plans/` | manual |
| Execute a plan task | `superpowers:executing-plans` or `superpowers:subagent-driven-development` | manual: pick the next unchecked item, do it, check it off | manual |
| Write tests first | `superpowers:test-driven-development` skill | manual: write a failing test, make it pass, refactor | manual |
| Verify before claiming done | `superpowers:verification-before-completion` skill | manual: run the build / test / open the screen and confirm | manual |
| Update this `AGENTS.md` | `claude-md-management:revise-claude-md` skill | manual edit | manual edit |

The skill names are shortcuts for these workflows; the workflows themselves apply to every agent. **No skill is required to do the right thing.**

---

## 10. Codex-specific notes

If you are Codex (or any non-Claude agent), be aware of these gotchas:

- You may not have `gh` (GitHub CLI) available. For GitHub work (PRs, issues), have the user share/run commands themselves.
- You don't have access to MCPs available in Claude Code (`context7`, `playwright`). When fetching library docs, use plain web search; results are slower but adequate.
- The user has a **memory system** at `C:\Users\Syed Irfan\.claude\projects\...\memory\` that Claude Code reads automatically. You don't read that — but the user-facing facts from it are mirrored into Section 2 of this file. That's enough.

---

## 11. Working directory & paths

- The repo lives at `C:\coding\mygangbyantig\` on the user's Windows 11 machine.
- Use **forward slashes in file paths in Bash**, **backslashes in PowerShell**.
- Tooling assumes you launch from the repo root.

---

## 12. Change log

| Date | Change | Author |
|---|---|---|
| 2026-04-29 | Initial AGENTS.md created at the start of the mobile-app initiative | Claude Opus 4.7 |
