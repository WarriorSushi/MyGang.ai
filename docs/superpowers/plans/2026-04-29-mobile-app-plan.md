# MyGang Mobile App — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL — Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Codex agents:** the workflow is the same — pick the next unchecked checkbox, do that step, check it off. The skill names are Claude Code shortcuts; the workflow underneath them is universal.

**Goal:** Ship a native React Native + Expo mobile app for MyGang.ai with full feature parity to the web app, in a monorepo alongside the existing Next.js app.

**Architecture:** Convert the existing Next.js repo into a pnpm/Turborepo monorepo (`apps/web`, `apps/mobile`, `packages/shared`). The mobile app reuses the web app's `/api/*` routes as its backend, and shares Zod schemas, types, character configs, and prompt-building logic via `packages/shared`. See spec at `docs/superpowers/specs/2026-04-29-mobile-app-design.md`.

**Tech Stack:** React Native + Expo SDK 54+ + TypeScript + Expo Router + NativeWind v4 + Reanimated 3 + Zustand + TanStack Query + Supabase JS + Vercel `ai` SDK + `react-native-iap` + Sentry RN. EAS Build + EAS Update for CI/distribution.

**Master timeline:** ~6 months solo, 7 phases.

---

## Phase index

| Phase | Name | Plan file | Status |
|---|---|---|---|
| 0 | Foundation (monorepo + Hello World mobile build) | This file (Phase 0 section below) | Not started |
| 1 | Auth + app shell | `2026-XX-XX-mobile-app-phase-1-auth.md` | Plan to be written when Phase 0 completes |
| 2 | Core chat experience | `2026-XX-XX-mobile-app-phase-2-chat.md` | Plan to be written when Phase 1 completes |
| 3 | Push, settings, account | `2026-XX-XX-mobile-app-phase-3-platform.md` | Plan to be written when Phase 2 completes |
| 4 | Billing & Play Console | `2026-XX-XX-mobile-app-phase-4-billing.md` | Plan to be written when Phase 3 completes |
| 5 | Polish & closed beta | `2026-XX-XX-mobile-app-phase-5-polish.md` | Plan to be written when Phase 4 completes |
| 6 | Production launch | `2026-XX-XX-mobile-app-phase-6-launch.md` | Plan to be written when Phase 5 completes |

**Why one plan per phase, not one master plan with all 6 months pre-planned:** library APIs change, decisions clarify after Phase 0 lands, and any agent (human or AI) can only meaningfully review ~50 tasks at a time. Each phase plan is written when the previous phase exits, so it benefits from current context.

---

## Phase 0 — Foundation

**Goal:** Monorepo exists. The existing web app continues to work and deploy exactly as before. A "Hello World" Android `.apk` is installed and running on the user's phone, signed and built via EAS. Play Console developer paperwork is started.

**Why this phase exists:** Mobile rewrites die when builds/sign/install fails 80% of the way through. This phase proves the entire pipeline works while the codebase is still empty. Every feature added afterwards goes through a known-working pipeline.

**Estimated effort:** ~2 weeks calendar.

**Exit criteria (every one must be true):**
1. Web app at https://mygang.ai still works identically. Playwright suite passes. Vercel deploys succeed.
2. Repo structure is `apps/web/` + `apps/mobile/` + `packages/shared/`, with pnpm workspaces and Turborepo configured.
3. `packages/shared` exports at least the existing TypeScript types, and the web app imports from it successfully.
4. `apps/mobile` is a fresh Expo SDK 54+ TypeScript project that builds locally to a debug client.
5. EAS Build produces a signed `.apk` from `apps/mobile`.
6. The user has installed that `.apk` on their physical Android phone, opened it, seen "MyGang" text on screen, and Sentry RN has logged a deliberate test crash from that build.
7. Play Console developer account verification is in progress or complete (the $25 paperwork has been submitted).

---

### Pre-flight: critical preconditions

These must be resolved by the user **before any Phase 0 task begins**. They are not Phase 0 tasks themselves.

- [ ] **Pre-flight 1: Resolve in-progress Codex work.** As of 2026-04-29 the repo is on branch `codex/production-chat-audit-fixes` with uncommitted modifications to `src/app/api/chat/route.ts`, `src/hooks/use-chat-api.ts`, `src/lib/ai/memory.ts`, `src/lib/ai/response-style.ts`, `src/lib/ai/system-prompt.ts`, `tests/memory-harden.test.ts`, `tests/response-style.test.ts`, plus untracked files `src/lib/live-chat-context.ts` and `tests/live-chat-context.test.ts`. The monorepo restructure in Task 0.2 will conflict with all of this. Either: (a) complete the Codex audit, merge it to `master`, then start Phase 0; or (b) stash/abandon the Codex work; or (c) fork a new clean branch from `master` for Phase 0 work and let Codex's branch finish independently. **User must choose one before Task 0.0.**

- [ ] **Pre-flight 2: Rotate the secrets pasted in chat on 2026-04-29.** Per spec section 1.2 and AGENTS.md hard rule #1. Highest priority: DodoPayments LIVE API key + webhook secret, Supabase service-role key. Followed by OpenRouter, Sentry auth token, Resend, Google OAuth client secret, Meta CAPI token, Upstash Redis token, cron secret, admin discount code. Workflow: regenerate in each provider's dashboard → paste new value into Vercel env vars → trigger redeploy. Two exceptions: Google OAuth client secret must also be updated in Supabase → Authentication → Providers → Google; DodoPayments webhook secret must also be updated in Vercel for the webhook signature verification to keep working. Suggested deferred to "end of development" by user — acceptable for pre-flight 2 to remain unchecked through Phase 0 if user explicitly accepts the risk.

- [ ] **Pre-flight 3: User has a physical Android phone available for testing.** The Hello World `.apk` exit criterion requires installing on a real device. An emulator is not sufficient — Phase 0's purpose includes proving the build/sign/install pipeline against real hardware.

---

### Task 0.0 — Establish a clean baseline

**Files:** none (verification only).

**Why:** Before restructuring, prove the current web app is in a working state. If something is broken now, we will not know later whether we broke it or it was already broken.

- [ ] **Step 1: Verify git state is clean.**

  Run from `C:\coding\mygangbyantig\`:
  ```bash
  git status
  ```

  Expected: "nothing to commit, working tree clean" on whichever branch you've chosen as your Phase 0 starting point (likely `master` after merging Pre-flight 1).

  If anything is dirty, stop and resolve Pre-flight 1.

- [ ] **Step 2: Verify the web app builds.**

  ```bash
  pnpm install
  pnpm build
  ```

  Expected: build completes with exit code 0. No TypeScript errors. `.next/` directory created.

- [ ] **Step 3: Verify the existing test suite passes.**

  ```bash
  pnpm test:fast
  ```

  Expected: all tests pass. Note the count (e.g., "47 tests passed") for comparison after restructure.

- [ ] **Step 4: Record the baseline.**

  Append a single line to a new file `docs/superpowers/sessions/2026-04-29-session-01.md` (or whatever the current session log is): "Phase 0 baseline: build OK, X tests passed on commit `<short SHA from git rev-parse --short HEAD>`."

- [ ] **Step 5: Commit the spec, AGENTS.md, and CLAUDE.md (the documents written during brainstorming on 2026-04-29).**

  ```bash
  git add AGENTS.md CLAUDE.md docs/superpowers/specs/2026-04-29-mobile-app-design.md docs/superpowers/plans/2026-04-29-mobile-app-plan.md
  git commit -m "docs: add mobile app design spec and master implementation plan"
  ```

  Expected: commit succeeds. `git status` is clean.

---

### Task 0.1 — Create the monorepo skeleton

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json` (root) — minor edits, see steps
- Create: `turbo.json`

**Note:** the repo already contains `pnpm-workspace.yaml` (seen 2026-04-29). Read its current contents before editing — do not blindly overwrite.

- [ ] **Step 1: Read existing `pnpm-workspace.yaml`.**

  ```bash
  cat pnpm-workspace.yaml
  ```

  If it already lists `apps/*` and `packages/*`, skip Step 2 and verify in Step 3 only. If it's empty or has different content, continue to Step 2.

- [ ] **Step 2: Set `pnpm-workspace.yaml` to declare the workspaces.**

  Write file contents:
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
  ```

- [ ] **Step 3: Install Turborepo as a dev dependency at the root.**

  ```bash
  pnpm add -Dw turbo
  ```

  Expected: `turbo` appears in root `package.json` `devDependencies`.

- [ ] **Step 4: Create `turbo.json` at the repo root.**

  Contents:
  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": [".next/**", "!.next/cache/**", "dist/**"]
      },
      "lint": {},
      "test": {
        "dependsOn": ["^build"]
      },
      "test:fast": {},
      "dev": {
        "cache": false,
        "persistent": true
      }
    }
  }
  ```

- [ ] **Step 5: Create empty `apps/` and `packages/` directories.**

  ```bash
  mkdir -p apps packages
  ```

  Expected: directories exist (currently empty).

- [ ] **Step 6: Sanity check — run `pnpm install` from root.**

  ```bash
  pnpm install
  ```

  Expected: install completes; warnings about empty workspaces are OK at this stage. No errors.

- [ ] **Step 7: Commit.**

  ```bash
  git add pnpm-workspace.yaml turbo.json package.json apps/ packages/ pnpm-lock.yaml
  git commit -m "chore: scaffold monorepo (pnpm workspaces + turborepo)"
  ```

---

### Task 0.2 — Move web app into `apps/web/`

**Files:**
- Move (with `git mv`, preserves history): `src/`, `public/`, `tests/`, `scripts/`, `supabase/`, `next.config.ts`, `next-env.d.ts`, `eslint.config.mjs`, `playwright.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `tsconfig.tsbuildinfo`, `vercel.json`, `sentry.edge.config.ts`, `sentry.server.config.ts`, `components.json`
- Move: `package.json` → `apps/web/package.json` (will need root package.json adjustments)
- Keep at root: `pnpm-workspace.yaml`, `turbo.json`, `pnpm-lock.yaml`, `AGENTS.md`, `CLAUDE.md`, `docs/`, `design_docs/`, `.gitignore`, `LICENSE`, `README.md`, `output/` (if present)

**Why:** the existing Next.js code becomes the `web` workspace. Moving with `git mv` preserves history.

- [ ] **Step 1: Create the `apps/web/` directory.**

  ```bash
  mkdir -p apps/web
  ```

- [ ] **Step 2: `git mv` the web-specific files into `apps/web/`.**

  ```bash
  git mv src apps/web/
  git mv public apps/web/
  git mv tests apps/web/
  git mv scripts apps/web/
  git mv supabase apps/web/
  git mv next.config.ts apps/web/
  git mv next-env.d.ts apps/web/
  git mv eslint.config.mjs apps/web/
  git mv playwright.config.ts apps/web/
  git mv postcss.config.mjs apps/web/
  git mv tsconfig.json apps/web/
  git mv vercel.json apps/web/
  git mv sentry.edge.config.ts apps/web/
  git mv sentry.server.config.ts apps/web/
  git mv components.json apps/web/
  git mv package.json apps/web/package.json
  ```

  If any of those paths don't exist, skip that line and note it. Use `ls` first to check.

  Run `tsconfig.tsbuildinfo` only if it exists — it's a build artifact, may or may not be present. If present:
  ```bash
  git mv tsconfig.tsbuildinfo apps/web/ 2>/dev/null || true
  ```

- [ ] **Step 3: Create a new root-level `package.json`.**

  ```json
  {
    "name": "mygang-monorepo",
    "version": "0.0.1",
    "private": true,
    "packageManager": "pnpm@9.0.0",
    "scripts": {
      "build": "turbo run build",
      "lint": "turbo run lint",
      "test": "turbo run test",
      "test:fast": "turbo run test:fast",
      "dev": "turbo run dev"
    },
    "devDependencies": {
      "turbo": "^2.0.0"
    }
  }
  ```

  (Use whatever `turbo` version was installed in Task 0.1 step 3 — check the existing entry rather than hardcoding `^2.0.0`.)

  Use whatever `pnpm` version is currently installed: run `pnpm --version` and put `pnpm@<that-version>` in `packageManager`.

- [ ] **Step 4: Update `apps/web/package.json` — rename and tighten scripts to be web-app-scoped.**

  Read `apps/web/package.json`. Change:
  - `"name": "mygangbyantig"` → `"name": "@mygang/web"`
  - Keep all existing scripts as they are. Turborepo will route `pnpm build` (root) to `pnpm --filter=@mygang/web build`.

- [ ] **Step 5: Run `pnpm install` from the root.**

  ```bash
  pnpm install
  ```

  Expected: completes. `apps/web/node_modules` should be largely a symlink farm into the root's `.pnpm` store. No errors.

- [ ] **Step 6: Update `apps/web/playwright.config.ts` paths if it has any path-relative configuration.**

  Open `apps/web/playwright.config.ts` and verify `testDir` is relative (e.g. `./tests`), not absolute. If absolute, change to relative.

- [ ] **Step 7: Update `apps/web/vercel.json` if it references paths.**

  Open `apps/web/vercel.json` and check for any `outputDirectory`, `buildCommand`, etc. Most should remain unchanged because they're already relative to the workspace.

- [ ] **Step 8: Verify the web app still builds.**

  ```bash
  pnpm --filter=@mygang/web build
  ```

  Expected: build completes with exit code 0. Same output as Task 0.0 step 2.

- [ ] **Step 9: Verify the test suite still passes.**

  ```bash
  pnpm --filter=@mygang/web test:fast
  ```

  Expected: same number of tests pass as in Task 0.0 step 3.

- [ ] **Step 10: Commit the monorepo move.**

  ```bash
  git add -A
  git commit -m "refactor: move web app into apps/web (monorepo)"
  ```

  Expected: large commit, mostly file moves (git tracks them as renames; should preserve history per file).

---

### Task 0.3 — Update Vercel deployment to point at `apps/web`

**Files:** Vercel project settings (modified via Vercel dashboard, not code). One repo file may need editing.

**Note:** This is a **manual user action** (clicking in Vercel dashboard). Document it clearly so the user can do it.

- [ ] **Step 1: USER ACTION — log into Vercel.**

  Visit https://vercel.com/dashboard, find the MyGang project.

- [ ] **Step 2: USER ACTION — set Root Directory to `apps/web`.**

  Project → Settings → General → Root Directory → enter `apps/web` → Save.

- [ ] **Step 3: USER ACTION — verify Build & Output Settings.**

  Build Command: `pnpm build` (default; should auto-detect Next.js).
  Output Directory: leave default (`.next`).
  Install Command: `pnpm install` (default).

- [ ] **Step 4: USER ACTION — push the monorepo branch and trigger a preview deploy.**

  ```bash
  git push origin <current-branch>
  ```

  Then in Vercel: project → Deployments → check the latest deploy succeeds.

- [ ] **Step 5: USER ACTION — verify the preview URL works.**

  Open the Vercel preview URL. Sign in. Open `/chat`. Send a message. Confirm AI streaming works.

  If the preview is broken, **stop**. Do not merge to production.

- [ ] **Step 6: USER ACTION — promote to production once preview is verified.**

  Either: merge the branch to `master` (which auto-deploys to production), or in the Vercel dashboard click "Promote to Production" on the verified preview deployment.

- [ ] **Step 7: USER ACTION — verify production at https://mygang.ai still works.**

  Sign in. Open `/chat`. Send a message. Test billing flow if convenient.

  If production is broken, immediately revert the Vercel root-directory setting to its previous value, redeploy. Investigate offline.

---

### Task 0.4 — Initialize `packages/shared`

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/index.ts` (with at least one type lifted from `apps/web/src/types/`)
- Test: `packages/shared/src/types/index.test.ts`

**Why:** Both apps need to share types/Zod/character data. We start small — lift just one type — to validate the workflow before bulk-lifting.

- [ ] **Step 1: Create `packages/shared/package.json`.**

  ```json
  {
    "name": "@mygang/shared",
    "version": "0.0.1",
    "private": true,
    "main": "./src/index.ts",
    "types": "./src/index.ts",
    "exports": {
      ".": "./src/index.ts",
      "./types": "./src/types/index.ts"
    },
    "scripts": {
      "lint": "echo 'no lint'",
      "test": "echo 'no tests yet'",
      "test:fast": "echo 'no tests yet'"
    }
  }
  ```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`.**

  ```json
  {
    "extends": "../../apps/web/tsconfig.json",
    "compilerOptions": {
      "rootDir": "./src",
      "outDir": "./dist",
      "noEmit": true,
      "jsx": "preserve"
    },
    "include": ["src/**/*"]
  }
  ```

- [ ] **Step 3: Pick the simplest existing type from `apps/web/src/types/` to lift first.**

  ```bash
  ls apps/web/src/types/
  ```

  Choose one small, dependency-free type file (e.g. one that defines a small interface and imports nothing from elsewhere). Read its contents to confirm it's free of deps on web-specific things like `next`.

  Record which file you chose in the session log.

- [ ] **Step 4: Write the failing test FIRST.**

  Create `packages/shared/src/types/index.test.ts`:

  ```typescript
  import { describe, it, expect } from "node:test";
  import type { ExampleType } from "./index";

  // This test exists to prove @mygang/shared exports something importable.
  // Replace `ExampleType` with whatever type was lifted in step 3.
  it("@mygang/shared exports types", () => {
    const obj: ExampleType = /* a valid value of the type */;
    expect(obj).toBeDefined();
  });
  ```

  Replace `ExampleType` and the placeholder with the actual type and a real instance.

- [ ] **Step 5: Create `packages/shared/src/types/index.ts` with the lifted type.**

  Copy the contents of the chosen type file from `apps/web/src/types/`. If the type has no internal-import dependencies, this is a one-line copy.

- [ ] **Step 6: Create `packages/shared/src/index.ts` re-exporting everything.**

  ```typescript
  export * from "./types";
  ```

- [ ] **Step 7: Add `@mygang/shared` as a workspace dependency to `apps/web/package.json`.**

  In `apps/web/package.json`, add to `dependencies`:
  ```json
  "@mygang/shared": "workspace:*"
  ```

- [ ] **Step 8: Update one place in `apps/web/src/` to import the lifted type from `@mygang/shared` instead of the local file.**

  Find a file that uses the lifted type. Change its `import` statement to use `@mygang/shared/types` (or `@mygang/shared`). Delete the now-redundant local type definition file.

- [ ] **Step 9: Run install + build + tests.**

  ```bash
  pnpm install
  pnpm --filter=@mygang/web build
  pnpm --filter=@mygang/web test:fast
  ```

  Expected: all green. Same test count as Task 0.0 step 3.

- [ ] **Step 10: Commit.**

  ```bash
  git add -A
  git commit -m "feat(shared): initialize @mygang/shared with first lifted type"
  ```

---

### Task 0.5 — Bootstrap `apps/mobile` with Expo

**Files:**
- Create: entire `apps/mobile/` directory tree, generated by `create-expo-app`

**Why:** the mobile app is a fresh project — no migration needed, just initialization with the right config from the start.

- [ ] **Step 1: From the repo root, run `create-expo-app`.**

  ```bash
  pnpm dlx create-expo-app@latest apps/mobile --template default --no-install
  ```

  The `--no-install` flag prevents npm from running inside the new directory; we'll let pnpm hoist deps from the workspace root.

  Expected: `apps/mobile/` created with Expo's default template. Includes `app/`, `package.json`, `app.json`, `tsconfig.json`, etc.

- [ ] **Step 2: Set the mobile package name and version.**

  Edit `apps/mobile/package.json`:
  - `"name"` → `"@mygang/mobile"`
  - `"version"` → `"0.0.1"`
  - `"private"` → `true`

- [ ] **Step 3: Set the mobile app identifier in `apps/mobile/app.json`.**

  Open `apps/mobile/app.json`. Set:
  ```json
  {
    "expo": {
      "name": "MyGang",
      "slug": "mygang-mobile",
      "scheme": "mygang",
      "version": "0.0.1",
      "ios": { "bundleIdentifier": "ai.mygang.app" },
      "android": { "package": "ai.mygang.app" }
    }
  }
  ```

  Keep all other defaults from the template.

- [ ] **Step 4: Install dependencies via root `pnpm install`.**

  ```bash
  cd "C:/coding/mygangbyantig"
  pnpm install
  ```

  Expected: install completes; `apps/mobile/node_modules` is populated.

- [ ] **Step 5: Verify the Expo dev server starts.**

  ```bash
  pnpm --filter=@mygang/mobile dlx expo start
  ```

  Expected: a QR code appears in the terminal. Press `q` to exit. Do not yet open on a device.

- [ ] **Step 6: Add a workspace dependency on `@mygang/shared`.**

  Edit `apps/mobile/package.json`, add to `dependencies`:
  ```json
  "@mygang/shared": "workspace:*"
  ```

  Re-run `pnpm install` from root.

- [ ] **Step 7: In the default `apps/mobile/app/index.tsx`, import the type from `@mygang/shared`.**

  Open `apps/mobile/app/index.tsx`. Add at the top:
  ```typescript
  import type { ExampleType } from "@mygang/shared";
  ```

  Replace `ExampleType` with whatever was lifted in Task 0.4 step 3. The compiler should resolve it.

- [ ] **Step 8: Type-check the mobile app.**

  ```bash
  pnpm --filter=@mygang/mobile dlx tsc --noEmit
  ```

  Expected: no type errors.

- [ ] **Step 9: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): scaffold Expo app and wire @mygang/shared import"
  ```

---

### Task 0.6 — Add core mobile dependencies (NativeWind, Reanimated, Sentry, Supabase)

**Files:**
- Modify: `apps/mobile/package.json`, `apps/mobile/babel.config.js`, `apps/mobile/metro.config.js`, `apps/mobile/global.css` (new), `apps/mobile/tailwind.config.js` (new), `apps/mobile/app/_layout.tsx`

**Why:** these are the core libraries every screen will use. Get them installed and verified working with one minimal smoke test before any feature work begins.

- [ ] **Step 1: Install NativeWind v4.**

  ```bash
  pnpm --filter=@mygang/mobile add nativewind
  pnpm --filter=@mygang/mobile add -D tailwindcss@^3.4.0 prettier-plugin-tailwindcss
  ```

  (Note: NativeWind v4 currently requires Tailwind v3, not v4. Check NativeWind's current docs at https://www.nativewind.dev/ to confirm — if v4 of NativeWind now supports Tailwind v4, install Tailwind v4 instead. **Use context7 MCP to fetch current NativeWind docs at this step.**)

- [ ] **Step 2: Configure Tailwind for the mobile app.**

  Create `apps/mobile/tailwind.config.js`:
  ```javascript
  module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: { extend: {} },
    plugins: [],
  };
  ```

  Create `apps/mobile/global.css`:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

- [ ] **Step 3: Update Babel + Metro config per NativeWind docs.**

  At time of writing, NativeWind requires:

  `apps/mobile/babel.config.js`:
  ```javascript
  module.exports = function (api) {
    api.cache(true);
    return {
      presets: [
        ["babel-preset-expo", { jsxImportSource: "nativewind" }],
        "nativewind/babel",
      ],
    };
  };
  ```

  `apps/mobile/metro.config.js`:
  ```javascript
  const { getDefaultConfig } = require("expo/metro-config");
  const { withNativeWind } = require("nativewind/metro");

  const config = getDefaultConfig(__dirname);

  module.exports = withNativeWind(config, { input: "./global.css" });
  ```

  **Verify both configs against current NativeWind docs via context7 MCP** — these snippets may be stale.

- [ ] **Step 4: Install Reanimated 3.**

  ```bash
  pnpm --filter=@mygang/mobile dlx expo install react-native-reanimated
  ```

  Add `"react-native-reanimated/plugin"` to the babel plugins list in `babel.config.js`. **Reanimated requires that plugin to be the LAST item in the plugins array.**

- [ ] **Step 5: Install Sentry RN.**

  ```bash
  pnpm --filter=@mygang/mobile dlx expo install @sentry/react-native
  ```

  Configure in `apps/mobile/app/_layout.tsx`:
  ```typescript
  import * as Sentry from "@sentry/react-native";

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, // set via app.json env
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.1,
  });

  // … existing layout code …
  ```

  **Use a separate Sentry project for mobile** (per spec section 5.4) — not the same DSN as web. Create the project in Sentry first, then put the new DSN in env.

- [ ] **Step 6: Install Supabase JS + RN polyfills.**

  ```bash
  pnpm --filter=@mygang/mobile add @supabase/supabase-js react-native-url-polyfill
  pnpm --filter=@mygang/mobile dlx expo install @react-native-async-storage/async-storage
  ```

  Create `apps/mobile/lib/supabase.ts`:
  ```typescript
  import "react-native-url-polyfill/auto";
  import { createClient } from "@supabase/supabase-js";
  import AsyncStorage from "@react-native-async-storage/async-storage";

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  ```

- [ ] **Step 7: Add the public env vars to `apps/mobile/app.json`.**

  In `apps/mobile/app.json`, add an `extra` block under `expo`:
  ```json
  "extra": {
    "supabaseUrl": "https://rpizfqjtrwhackeqcsau.supabase.co",
    "supabaseAnonKey": "<paste anon key>",
    "sentryDsn": "<paste mobile-specific DSN>"
  }
  ```

  (The anon key is public-by-design per spec section 3.8.)

  Alternative: use `EXPO_PUBLIC_*` env vars instead of `extra` (modern Expo recommendation). **Verify current Expo env-var pattern via context7 MCP.**

- [ ] **Step 8: Replace `apps/mobile/app/index.tsx` with a Hello World using NativeWind + Reanimated + Sentry.**

  ```tsx
  import { Text, View } from "react-native";
  import * as Sentry from "@sentry/react-native";
  import "../global.css";

  export default function Index() {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <Text className="text-3xl font-bold text-white">MyGang</Text>
        <Text className="mt-2 text-zinc-400">Hello from the gang.</Text>
      </View>
    );
  }
  ```

- [ ] **Step 9: Type-check.**

  ```bash
  pnpm --filter=@mygang/mobile dlx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 10: Local device test — run `expo start` and open on the phone via Expo Go.**

  ```bash
  pnpm --filter=@mygang/mobile dlx expo start
  ```

  Scan the QR code with the Expo Go app on the user's Android phone.

  Expected: app loads, "MyGang" text appears, dark background visible (proves NativeWind classes work).

- [ ] **Step 11: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): add core deps (NativeWind, Reanimated, Sentry, Supabase)"
  ```

---

### Task 0.7 — Configure EAS Build and produce a signed `.apk`

**Files:**
- Create: `apps/mobile/eas.json`
- Modify: `apps/mobile/app.json` (EAS project linkage added by `eas init`)

**Why:** Expo Go is a developer convenience; the real exit criterion is a *standalone signed `.apk`* that proves the build/sign/install pipeline works.

- [ ] **Step 1: USER ACTION — sign up for an Expo account if not already.**

  Create at https://expo.dev. Free tier covers what Phase 0 needs.

- [ ] **Step 2: Install EAS CLI globally (or use dlx each time).**

  ```bash
  pnpm dlx eas-cli@latest --version
  ```

  Expected: prints a version number.

- [ ] **Step 3: USER ACTION — log into EAS.**

  ```bash
  pnpm dlx eas-cli login
  ```

  Enter Expo account credentials.

- [ ] **Step 4: Initialize EAS in the mobile app.**

  ```bash
  cd apps/mobile
  pnpm dlx eas-cli init
  ```

  This sets a project ID in `app.json` and creates an EAS project on the dashboard.

- [ ] **Step 5: Create `apps/mobile/eas.json`.**

  ```json
  {
    "cli": { "version": ">= 13.0.0" },
    "build": {
      "development": {
        "developmentClient": true,
        "distribution": "internal",
        "android": { "gradleCommand": ":app:assembleDebug" }
      },
      "preview": {
        "distribution": "internal",
        "android": { "buildType": "apk" }
      },
      "production": {
        "android": { "buildType": "app-bundle" }
      }
    },
    "submit": {
      "production": {}
    }
  }
  ```

- [ ] **Step 6: Trigger the first preview Android build.**

  ```bash
  pnpm dlx eas-cli build --profile preview --platform android
  ```

  EAS will ask to generate Android signing credentials — say yes, let it manage them.

  Expected: cloud build runs (~10-20 minutes). You'll get a URL to a `.apk` when it completes.

- [ ] **Step 7: USER ACTION — download the `.apk` to their phone.**

  Open the EAS build URL on the Android phone, tap "Install."

  If "Install from unknown sources" needs enabling: Settings → Apps → (browser used) → "Allow from this source."

- [ ] **Step 8: USER ACTION — open the installed app and confirm it shows "MyGang."**

  Tap the installed MyGang app icon. Confirm:
  - Dark background
  - "MyGang" heading
  - "Hello from the gang." subtitle

- [ ] **Step 9: USER ACTION — trigger a deliberate test crash.**

  Add a temporary "Crash Sentry" button to `apps/mobile/app/index.tsx`:
  ```tsx
  import { Pressable } from "react-native";
  import * as Sentry from "@sentry/react-native";

  // … inside the View …
  <Pressable
    className="mt-8 rounded-lg bg-red-600 px-4 py-2"
    onPress={() => Sentry.nativeCrash()}
  >
    <Text className="text-white">Crash Sentry (test)</Text>
  </Pressable>
  ```

  Rebuild, install, tap the button, confirm the crash report appears in the Sentry mobile project's Issues view within ~5 minutes.

  After confirmed, **remove the test button** in a cleanup commit.

- [ ] **Step 10: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): EAS build config + first signed APK on device"
  ```

---

### Task 0.8 — Start Play Console developer account (USER MANUAL TASK)

**Files:** none (Google's web dashboard).

**Why:** verification can take days. Starting now means the account is ready when Phase 4 needs it (~5 months later).

- [ ] **Step 1: USER ACTION — sign up at https://play.google.com/console/signup.**

- [ ] **Step 2: USER ACTION — pay the $25 USD one-time registration fee.**

- [ ] **Step 3: USER ACTION — complete identity verification (government ID, address proof).**

  Google's verification can take 2-5 business days. May take longer if anything is rejected.

- [ ] **Step 4: USER ACTION — note developer account confirmation email date.**

  Record it in the session log so we know when verification completes.

---

### Task 0.9 — Phase 0 exit verification

**Files:** none (verification only).

- [ ] **Step 1: Web app at https://mygang.ai still works.**

  Open production. Sign in. Open `/chat`. Send a message.

- [ ] **Step 2: `pnpm install && pnpm build && pnpm test:fast` from repo root all succeed.**

- [ ] **Step 3: `apps/mobile/` builds locally (`pnpm --filter=@mygang/mobile dlx tsc --noEmit`).**

- [ ] **Step 4: The Hello World `.apk` is installed on the user's Android phone and runs.**

- [ ] **Step 5: Sentry RN logged the test crash from the production-style build.**

- [ ] **Step 6: Play Console developer account verification is in progress (or complete).**

- [ ] **Step 7: Update `docs/superpowers/sessions/` with Phase 0 completion log.**

  Final session log entry for Phase 0:
  - All exit criteria checked
  - Total commits in Phase 0
  - Anything surprising / lessons learned for Phase 1

- [ ] **Step 8: Write the Phase 1 plan.**

  Use the `writing-plans` skill (Claude) or follow the same structure manually (Codex). Save to `docs/superpowers/plans/<today's-date>-mobile-app-phase-1-auth.md`.

  Update the Phase index at the top of this file with the new filename.

---

## Phases 1-6 — outlines

**Each phase below will get its own detailed plan when its prerequisite phase exits.** These outlines exist so any agent can see the shape of the road ahead.

### Phase 1 — Auth + app shell (~3 weeks)
- Configure Expo deep linking (`mygang://`) and Supabase Auth redirect URLs.
- Build sign-up, sign-in, forgot-password, reset-password, post-auth onboarding screens.
- Wire Google OAuth via `expo-auth-session`.
- Set up Expo Router file tree mirroring web's main routes.
- Confirm session persistence across app restarts.
- Confirm deep links from password-reset email open the app correctly.
- **Exit criterion:** placeholder home screen visible after sign-in; auth state persists; deep links resolve.

### Phase 2 — Core chat experience (~6 weeks)
- Lift character configs and prompt-builders from `apps/web/src/` to `packages/shared/characters/` and `packages/shared/prompts/`. Web app refactored to import from shared.
- Character roster + selection screen.
- Group chat: FlashList message list, composer, typing indicators, multi-character interleaving logic.
- AI streaming via `useChat` hitting `/api/chat`.
- Supabase Realtime subscription for cross-device sync.
- Chat history loading + infinite scroll.
- Image rendering, link previews, message actions.
- **Exit criterion:** internal-test users can have working multi-character group chats on phone, parity with web feel.

### Phase 3 — Push, settings, account (~4 weeks)
- FCM project setup; Android push credentials uploaded to EAS.
- `expo-notifications` integration: token registration, permission flow, foreground/background handling, deep links from notification tap.
- New `/api/push/register` endpoint + server logic to send pushes to mobile clients.
- Settings screens: account, notifications, theme, language, delete account.
- Profile editing.
- Smaller things: about, privacy/terms (rendered in WebView), support contact, version info.
- **Exit criterion:** push notifications wake the app reliably; all non-billing settings work.

### Phase 4 — Billing & Play Console (~6 weeks)
- Play Console: app listing draft, internal testing track, subscription products defined matching DodoPayments products.
- `react-native-iap` integration: purchase flow, restore purchases, subscription management deep-link.
- New `/api/billing/play-receipt`: server-side receipt verification via Google Play Developer API; updates Supabase `subscriptions`.
- Real-time subscription updates via Pub/Sub webhook.
- Paywall UI in mobile.
- Sandbox-test every state: subscribe, cancel, refund, grace period, upgrade between tiers, restore purchases.
- **Exit criterion:** Android subscribers and web subscribers have the same effective access. All billing edge cases tested.

### Phase 5 — Polish & closed beta (~4 weeks)
- Animations + haptics (Reanimated polish, `expo-haptics`).
- Professional app icon, adaptive icon, splash screen.
- Play Store listing assets: feature graphic, screenshots, store description.
- Performance pass: bundle size, cold-start, scroll perf, memory under long chats.
- Accessibility: screen-reader labels, dynamic font sizing, contrast.
- Push to Play Store **closed testing track**, invite ~50 users, gather feedback.
- **Exit criterion:** closed-beta users report no blockers; crash-free user rate >99%.

### Phase 6 — Production launch (~2-4 weeks)
- Address closed-beta feedback.
- Promote to Play Store **production** with 10% staged rollout.
- EAS Update for OTA hotfixes.
- Monitoring playbook: Sentry alerts, crash-free rate target >99.5%.
- **Exit criterion:** v1 stable on production, full rollout, monitoring green.

---

## Self-review (writing-plans skill required)

Performed 2026-04-29 by Claude Opus 4.7:

**1. Spec coverage:** Each spec section maps to Phase 0 task or a Phase 1-6 outline.
- Spec §3.1 monorepo layout → Phase 0 Tasks 0.1, 0.2, 0.4, 0.5
- Spec §3.2 backend strategy → Phase 0 Task 0.4 step 8 (web app uses /api unchanged); Phase 2 (mobile consumes /api)
- Spec §3.3 auth → Phase 1
- Spec §3.4 realtime → Phase 2
- Spec §3.5 push → Phase 3
- Spec §3.6 payments → Phase 4
- Spec §3.7 anti-abuse → Phase 4 (deferred from Phase 1 since it depends on production traffic to validate)
- Spec §3.8 secrets handling → Phase 0 Task 0.6 step 7 (only public values in app.json)
- Spec §4 phasing → covered by Phase 0 + outlines

**2. Placeholder scan:** No `TBD`/`TODO`/`FIXME`/`XXX` literals. Every step has either explicit code, an explicit command, or an explicit user action.

**3. Type consistency:** `@mygang/shared` and `@mygang/web`, `@mygang/mobile` package names consistent across all tasks. `apps/web/`, `apps/mobile/`, `packages/shared/` paths consistent.

**4. Known fragilities:**
- NativeWind setup snippets (Task 0.6 steps 2-3) may go stale; the plan instructs the agent to verify via context7 MCP. This is the right behavior for a 6-month plan.
- Tailwind major-version requirement for NativeWind is fluid; same context7 verification applies.
- Expo SDK number ("54+") is a floor, not a fixed version; agents should use the latest stable when running Task 0.5.

---

## Change log

| Date | Change | Author |
|---|---|---|
| 2026-04-29 | Initial plan created. Phase 0 detailed; Phases 1-6 outlined. | Claude Opus 4.7 |
