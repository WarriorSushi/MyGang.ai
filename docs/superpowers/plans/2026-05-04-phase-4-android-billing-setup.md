# Phase 4 — Android Google Play Billing setup

Date: 2026-05-04
Owner: @WarriorSushi
Scope: Android-only in-app subscriptions for MyGang.ai. iOS is intentionally
out of scope for this phase; iOS users get Linking → web pricing as a fallback.

This doc is the human checklist that pairs with the code already shipped:

- `apps/mobile/lib/billing.ts` — connection probe + receipt POST
- `apps/mobile/app/(app)/pricing.tsx` — `useIAP` hook + `requestPurchase` flow
- `apps/web/src/app/api/billing/verify-android/route.ts` — server-side
  Google Play Developer API receipt validation
- `packages/shared/src/billing-skus.ts` — single source of truth for SKUs

## SKUs — must match Google Play Console exactly

| SKU                    | Tier  | Price     | Cadence       |
| ---------------------- | ----- | --------- | ------------- |
| `mygang_basic_monthly` | basic | $14.99 USD | Auto-renewing monthly |
| `mygang_pro_monthly`   | pro   | $19.99 USD | Auto-renewing monthly |

Any deviation here will silently break the verify endpoint (it rejects
unknown SKUs).

## 1. Prerequisites

- [ ] Google Play Console developer account (one-time $25 fee paid)
- [ ] App listing draft created with package name `ai.mygang.app`
- [ ] App content questionnaire completed (target audience, ads, etc.)
- [ ] Privacy policy URL set: https://mygang.ai/privacy
- [ ] Mobile dev build pipeline working (EAS Build)
  - `expo-iap` requires a custom dev client; Expo Go cannot test billing.

## 2. Define IAP products (Play Console)

Path: **Monetize → Products → Subscriptions**

For each SKU above:

1. Create subscription with the exact product ID from the table.
2. Name it (user-visible): "MyGang Basic" / "MyGang Pro".
3. Description (user-visible): match the pricing screen copy.
4. **Base plan**:
   - Plan ID: `monthly`
   - Billing period: 1 month
   - Auto-renewing: Yes
   - Price: $14.99 / $19.99 USD (Play auto-converts other regions)
   - Renewal type: Auto-renewing
5. **Offers**: optional. Free trial / introductory offers can be added later
   without a code change — the client uses whatever offer Play returns first.
6. Activate the product.

## 3. Service account for receipt validation

The verify endpoint needs to call Google Play Developer API. That requires a
service account credential.

### 3a. Cloud Console — create service account

1. https://console.cloud.google.com → select the project tied to your Play
   developer account (or create one if needed).
2. **IAM & Admin → Service Accounts → Create Service Account**.
3. Name: `play-billing-verify`. Role: `Service Account User`.
4. After creation: **Keys → Add Key → JSON**. Download. **Treat as a secret.**

### 3b. Play Console — invite the service account

1. **Users and permissions → Invite new user**.
2. Email: the service account's email (`xxx@xxx.iam.gserviceaccount.com`).
3. App permissions → grant on `MyGang` only:
   - `View financial data, orders, and cancellation survey responses`
   - `Manage orders and subscriptions`
4. Send invite. The service account is auto-accepted.

### 3c. Vercel — store the credential

```bash
# base64-encode the downloaded JSON
base64 -w 0 ~/Downloads/play-billing-verify-xxx.json
# → copy the resulting string
```

In Vercel project settings:

- Name: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- Value: the base64 blob
- Environments: Production + Preview (NOT development — that path is mocked)

The verify route reads this env at request time and mints OAuth2 tokens on
the fly. No SDK / external dep needed.

## 4. Internal testing track

1. **Production → Create new release → Internal testing**.
2. Upload signed AAB built via `eas build -p android --profile production`.
3. Add 1–4 license-testing accounts under **License testing** (Play Console
   global settings, not per-app). Use real Google accounts you control.
4. Add the same emails as **Internal testers** in the release tester list.
5. Review and roll out to internal testing.
6. Wait ~30 minutes for the release to propagate.
7. On a test device: install via the internal testing opt-in URL, sign in
   with a license-tester account, walk the purchase flow.
8. Verify in Play Console → Monetize → Subscriptions → Subscribers that the
   purchase appears.
9. Cancel the subscription from the device's Play Store → Subscriptions, and
   confirm `subscriptions.status` flips to `cancelled` next time the
   user opens the app (TODO: webhook for real-time updates is Phase 5).

## 5. Production rollout

- [ ] Internal testing has at least 1 successful purchase + cancellation
- [ ] Closed testing with ~10 external testers (1 week)
- [ ] Open testing OR direct production with 10% rollout
- [ ] Release notes filled in (English at minimum)
- [ ] Crash-free rate from internal testing > 99%
- [ ] Privacy policy and Terms of Service current
- [ ] Data safety section in store listing matches what we collect
- [ ] App content rating completed
- [ ] Production release pushed at 10% rollout, monitor for 48h
- [ ] Ramp to 50% → 100% over the following week

## 6. Known limitations / Phase 5 follow-ups

- **No real-time downgrade.** When a user cancels in Play Store, our DB
  doesn't learn about it until they open the app and a renewal check runs.
  Phase 5 should add Play Real-time Developer Notifications via Pub/Sub.
- **No restore purchases UI.** A user who reinstalls won't auto-recover
  their entitlement. `useIAP`'s `restorePurchases()` exists; wire to a
  button in Settings.
- **No iOS support.** iOS users see the web pricing link. StoreKit 2 via
  `expo-iap` works, but compliance + App Store review is its own phase.
- **No proration UI for upgrades.** Upgrading basic→pro currently treats it
  as a fresh purchase. `requestPurchase` supports `subscriptionProductReplacementParams`
  for true proration (8.1.0+) — wire when we see real upgrade traffic.
