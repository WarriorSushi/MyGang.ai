import assert from 'node:assert/strict'
import { validateGooglePlaySubscription } from '../src/lib/google-play-subscription'

const now = Date.parse('2026-08-04T12:00:00.000Z')
const validPurchase = {
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
    acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
    externalAccountIdentifiers: { obfuscatedExternalAccountId: 'user-1' },
    lineItems: [
        {
            productId: 'mygang_pro_monthly',
            expiryTime: '2026-09-04T12:00:00.000Z',
        },
    ],
}

assert.deepEqual(
    validateGooglePlaySubscription(validPurchase, 'mygang_pro_monthly', 'user-1', now),
    {
        ok: true,
        expiry: '2026-09-04T12:00:00.000Z',
        acknowledged: false,
    },
)

assert.equal(
    validateGooglePlaySubscription(validPurchase, 'mygang_basic_monthly', 'user-1', now).ok,
    false,
)
assert.deepEqual(
    validateGooglePlaySubscription(validPurchase, 'mygang_pro_monthly', 'user-2', now),
    { ok: false, status: 403, error: 'Purchase belongs to another account' },
)
assert.equal(
    validateGooglePlaySubscription(
        { ...validPurchase, subscriptionState: 'SUBSCRIPTION_STATE_PENDING' },
        'mygang_pro_monthly',
        'user-1',
        now,
    ).ok,
    false,
)
assert.equal(
    validateGooglePlaySubscription(
        {
            ...validPurchase,
            lineItems: [
                {
                    productId: 'mygang_pro_monthly',
                    expiryTime: '2026-07-04T12:00:00.000Z',
                },
            ],
        },
        'mygang_pro_monthly',
        'user-1',
        now,
    ).ok,
    false,
)

console.log('[google-play-subscription] state, product, account, and expiry checks passed')

