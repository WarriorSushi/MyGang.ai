export type GooglePlaySubscriptionV2 = {
    subscriptionState?: string
    acknowledgementState?: string
    linkedPurchaseToken?: string | null
    externalAccountIdentifiers?: {
        obfuscatedExternalAccountId?: string | null
    } | null
    lineItems?: Array<{
        productId?: string
        expiryTime?: string
    }>
}

export type GooglePlayValidation =
    | {
        ok: true
        expiry: string
        acknowledged: boolean
    }
    | {
        ok: false
        status: 400 | 403
        error: string
    }

const ENTITLED_STATES = new Set([
    'SUBSCRIPTION_STATE_ACTIVE',
    'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    // A voluntary cancellation keeps access until the paid period expires.
    'SUBSCRIPTION_STATE_CANCELED',
])

export function validateGooglePlaySubscription(
    purchase: GooglePlaySubscriptionV2,
    expectedProductId: string,
    expectedUserId: string,
    now = Date.now(),
): GooglePlayValidation {
    if (!purchase.subscriptionState || !ENTITLED_STATES.has(purchase.subscriptionState)) {
        return { ok: false, status: 400, error: 'Purchase not in valid state' }
    }

    const lineItem = purchase.lineItems?.find((item) => item.productId === expectedProductId)
    if (!lineItem) {
        return { ok: false, status: 400, error: 'Purchase does not contain this product' }
    }

    const expiryMs = lineItem.expiryTime ? Date.parse(lineItem.expiryTime) : Number.NaN
    if (!Number.isFinite(expiryMs) || expiryMs <= now) {
        return { ok: false, status: 400, error: 'Subscription has expired' }
    }

    const purchaseAccountId =
        purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null
    if (purchaseAccountId && purchaseAccountId !== expectedUserId) {
        return { ok: false, status: 403, error: 'Purchase belongs to another account' }
    }

    return {
        ok: true,
        expiry: new Date(expiryMs).toISOString(),
        acknowledged:
            purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    }
}

