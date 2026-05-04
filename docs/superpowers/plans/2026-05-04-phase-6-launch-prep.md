# Phase 6 — Production Launch Prep

> **For agentic workers:** This is a CHECKLIST for the user, not an executable plan for an agent. Most items require external accounts (Google Play Console, Firebase, Sentry, etc.) and human-only paperwork. The code-side scaffolding is already shipped (Phases 1-5).

**Goal:** Submit MyGang.ai to the Google Play Store and ship a stable production Android build.

**Estimated calendar:** ~2 weeks of paperwork + 24-48hr Google review per submission.

---

## Pre-flight — must be done before any other phase 6 step

1. **Google Play Console developer account.** $25 one-time. Sign up at https://play.google.com/console. Verify identity (24-48hr).
2. **EAS Build account.** Free tier OK for first builds. `eas login` then `eas init` in `apps/mobile/`. Copy the resulting `extra.eas.projectId` UUID into `apps/mobile/app.json`.
3. **Apply the open Supabase migrations** via dashboard SQL editor:
   - `apps/web/supabase/migrations/20260504100000_add_mobile_push_tokens.sql`
   - Then re-run `supabase gen types typescript --project-id xiekctfhbqkhoqplobep > packages/shared/src/database/types.ts` and remove the `(client.from as any)` casts in the affected route files.
4. **Set Vercel env vars** for production (also for preview):
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — base64-encoded service account JSON (see Phase 4 plan for setup)
   - All existing env vars stay as-is

---

## Step 1 — Build a release-candidate APK for internal testing

```bash
cd apps/mobile
eas build --profile preview --platform android
```

Outputs an APK you can sideload. Walk through the entire app in this build:
- Sign up + onboarding
- Chat (send messages, get responses, switch wallpapers)
- Settings (change email, change password, all destructive actions on a throwaway account)
- Memory vault (drawer opens from chat header)
- Pricing (CTAs trigger Google Play sheet — but no products yet, see step 2)
- Push notifications (tap Enable in settings, verify token registration via Vercel logs)

If anything's broken, fix and rebuild before moving to the production track.

---

## Step 2 — Google Play Console — App listing

In Play Console > Create app:

**App details:**
- Default language: English (US)
- App or game: App
- Free or paid: Free
- Declarations: confirm app meets Developer Program Policies
- Package name: `ai.mygang.app` (must match what's in app.json)

**Store listing:**

- **App name (max 30 chars):**
  ```
  MyGang — Your AI Friend Group
  ```

- **Short description (max 80 chars):**
  ```
  Real-feeling group chats with an AI gang that knows you and talks to itself.
  ```

- **Full description (max 4000 chars, draft):**
  ```
  YOUR GANG IS READY.

  MyGang isn't another AI chatbot. It's a group of friends — 14 hand-crafted
  characters with distinct personalities — who talk to YOU and to EACH OTHER.

  ✦ Real banter, not Q&A.
  Pick your gang in under a minute. Chat any time. Watch them riff off each
  other, drop inside jokes, and remember what you told them last week.

  ✦ Late-night company.
  When you can't sleep and don't feel like talking to anyone IRL, your gang's
  there. No drama, no judgment, just vibes.

  ✦ Each friend is a person.
  Rico's the chaotic one. Luna's the soft one. Atlas keeps things steady.
  Cleo's stylish and opinionated. Each character has their own voice, their
  own way of talking, their own opinions on the others.

  ✦ Memory that sticks.
  They remember your name, your story, what makes you tick. The longer you
  chat, the more it feels like a real friendship.

  ✦ Customize everything.
  Pick avatar packs (Robots, Human, Retro), rename characters, set wallpapers,
  switch chat modes. Your gang, your way.

  ✦ Free forever.
  25 messages per hour, preview memory, your gang of up to 4. Upgrade for
  unlimited messages, full memory, bigger squads.

  Built by humans who got tired of chatbots that feel like search engines.
  Try it. Your gang's waiting.

  Need help? hello@mygang.ai
  Privacy: https://mygang.ai/privacy
  Terms: https://mygang.ai/terms
  ```

- **App category:** Social
- **Tags (suggest 5):** social, chat, AI, friends, conversation
- **Contact details:**
  - Email: hello@mygang.ai (or your support address)
  - Website: https://mygang.ai
  - Phone: optional
- **Privacy policy:** https://mygang.ai/privacy

**Graphic assets needed (you must produce these):**
- App icon: 512×512 PNG, **required**. The mobile asset at `apps/mobile/assets/images/icon.png` is now the brand "M" logo at 512×512 — Play Console accepts it directly.
- Feature graphic: 1024×500 PNG, **required**. Branded marketing banner. Suggest: "M" logo on the left, gradient (teal → magenta) sweep, "Your gang is ready." headline. Need to create.
- Phone screenshots: 4-8 PNG screenshots, 16:9 to 9:16 ratio, **required**. Take from your test phone running the preview APK. Suggest:
  1. Welcome onboarding screen
  2. Vibe quiz with selection
  3. Selection step ("Pick your gang")
  4. Chat with gang banter (multiple speakers visible)
  5. Settings drawer with promo card
  6. Memory vault drawer
  7. Pricing screen
  8. Avatar Style step (cinematic)
- Tablet screenshots: optional but improves discovery
- Promo video: optional (YouTube URL)

---

## Step 3 — Define IAP products (paid subscriptions)

Play Console > Monetize > Subscriptions > Create:

**Product 1 — Basic Monthly:**
- Product ID: `mygang_basic_monthly` (must match `packages/shared/src/billing-skus.ts` exactly)
- Name: MyGang Basic
- Description: 40 messages/hour, full memory vault, larger squads, all avatar packs
- Base plan: 1 month auto-renewing
- Price: $14.99/mo (set per-region prices via auto-conversion)
- Free trial: optional (suggest: 7 days)

**Product 2 — Pro Monthly:**
- Product ID: `mygang_pro_monthly` (must match billing-skus.ts)
- Name: MyGang Pro
- Description: Unlimited messages, deepest memory recall, 6-character squads, priority response
- Base plan: 1 month auto-renewing
- Price: $19.99/mo
- Free trial: optional (suggest: 7 days)

Both products: **Activate** them. Inactive products won't show in the IAP flow even after release.

---

## Step 4 — Service account for receipt validation

This is what `/api/billing/verify-android` needs to talk to Google Play Developer API server-side.

**In Google Cloud Console (https://console.cloud.google.com):**
1. Use the SAME project that Play Console links to (auto-created on first IAP product), or create a new one and link it
2. APIs & Services > Library > enable "Google Play Android Developer API"
3. APIs & Services > Credentials > Create credentials > Service account
   - Name: `mygang-billing-verifier`
   - Skip role assignment in Cloud Console (Play Console handles permissions)
   - Click into the service account > Keys > Add Key > JSON > download

**In Play Console:**
1. Settings > Developer account > API access
2. Find your service account in the list (should auto-appear after the Google Cloud step)
3. Grant access > Permissions > **App permissions:**
   - Add app: select MyGang
   - Account permissions:
     - "View financial data, orders, and cancellation survey responses": ON
     - "Manage orders and subscriptions": ON

**Encode and set the env var:**

```bash
# On Mac/Linux:
base64 -i path/to/service-account.json | tr -d '\n'
# On Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\service-account.json"))
```

Copy the output. In Vercel: Project Settings > Environment Variables > add `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` with the base64 string. Apply to Production AND Preview.

---

## Step 5 — Internal testing track (FIRST release)

Before any public release, ALWAYS go through internal testing:

1. Play Console > Testing > Internal testing > Create new release
2. Upload the preview AAB:
   ```bash
   cd apps/mobile
   eas build --profile production --platform android
   # downloads .aab
   ```
3. Release name: `0.1.0-internal-1` (whatever)
4. Release notes: "Initial closed beta. Testing chat, memory vault, push notifications, subscription flow."
5. Save > Review release > Roll out to internal testing
6. Wait ~5-30 min for processing
7. Add testers: Internal testing > Testers > Create email list > add your own Google account + 5-10 trusted people
8. Share the opt-in link from the Testers page

**License testing accounts** (so testers can subscribe without being charged):
- Settings > License testing > add the same email addresses
- These accounts get test cards that don't actually charge

**Test flow per tester:**
- Sign up + onboard
- Send a few chat messages
- Tap Enable Notifications, verify token in Vercel logs
- Tap Upgrade > Pick a plan > Google Play sheet appears > complete purchase with test card
- Verify `profile.subscription_tier` flipped to basic/pro in Supabase
- Verify subscriptions row inserted
- Cancel via Play Store account > subscriptions > verify status flips

---

## Step 6 — Closed testing → Open testing → Production

**Closed testing** (optional intermediate step, if you want broader testing without going public):
- Same as internal testing but supports up to 200 testers via Google Groups
- More formal — Google reviews before approving the track

**Open testing:**
- Anyone with the opt-in link can install
- Counts toward Play Store install metrics
- Use this for a soft launch / waitlist

**Production:**
- Play Console > Production > Create new release
- Same AAB upload pattern
- **Rollout percentage:** start with 5%, monitor crash rate via Sentry + Play Console vitals, gradually increase to 100% over 2-7 days
- Google reviews each production release (24-72hr first time, faster after)

---

## Step 7 — Post-launch monitoring

- **Sentry** — currently the mobile project shares the web's Sentry instance. Before going to >10% production rollout, split into a dedicated `mygang-mobile` Sentry project (the TODO note in `app.json` flags this). Update the DSN in `app.json > extra.sentryDsn`. Re-enable Sentry by setting up a custom dev build (Sentry needs native modules).
- **Play Console vitals** — daily check for ANR rate, crash rate, slow rendering. Pause rollout if anything spikes.
- **Customer support inbox** — set up a hello@mygang.ai mailbox if not already (the Play Store listing routes complaints there).
- **Receipt verification logs** — Vercel function logs for `/api/billing/verify-android`. Watch for repeated 500s (likely a service account permission issue).

---

## Step 8 — Ongoing release cadence

- Bug fixes: update `app.json > version` (e.g., 0.1.1), bump `eas.json` autoIncrement does the build number, build production AAB, upload as new release in same track, roll out at 100% (small fixes don't need staged rollout).
- Feature updates: bump minor version (0.2.0), repeat the staged rollout pattern.
- iOS: not in scope yet. When ready, copy this checklist for Apple Developer account + App Store Connect + StoreKit 2 setup. The `react-native-iap` / `expo-iap` code already supports iOS — just needs Apple-side setup.

---

## What's already in code (you don't need to do)

- ✅ App icon + splash use the brand "M" logo from web (Phase 5)
- ✅ EAS Build profiles for development / preview / production (Phase 5)
- ✅ Push notification scaffolding (mobile lib + backend route + WYWA cron hook)
- ✅ Real account-delete purge endpoint (GDPR)
- ✅ Android Play Billing integration (mobile useIAP + backend Google Play Developer API verification)
- ✅ All visual + motion parity with web (Phases 1-5 of parity rebuild)
- ✅ Subscription management deep-link to Play Store from mobile settings

---

## Open questions / TODO before public launch

- [ ] Custom feature graphic (1024×500) — needs design work
- [ ] App screenshots taken from a real device running production build
- [ ] Confirm hello@mygang.ai is monitored
- [ ] Confirm privacy policy at /privacy reflects actual data practices (push tokens, billing data, etc.)
- [ ] Decide on free trial length for subscriptions (suggest: 7 days)
- [ ] Set up Sentry mobile project (separate from web)
- [ ] Set up Play Console alerts for crash rate > 1% / ANR rate > 0.5%
