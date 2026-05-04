import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 15

const ANDROID_PACKAGE = 'ai.mygang.app'

const SKU_TO_TIER: Record<string, 'basic' | 'pro'> = {
    mygang_basic_monthly: 'basic',
    mygang_pro_monthly: 'pro',
}

/**
 * Validate an Android in-app subscription purchase with Google Play Developer
 * API. Requires GOOGLE_PLAY_SERVICE_ACCOUNT_JSON env var (base64-encoded
 * service account JSON with androidpublisher scope).
 *
 * Updates profile.subscription_tier and upserts a subscriptions row on success.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rate = await rateLimit(`billing:${user.id}`, 20, 60_000)
    if (!rate.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let body: { purchaseToken?: string; productId?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { purchaseToken, productId } = body
    if (!purchaseToken || !productId) {
        return NextResponse.json({ error: 'Missing purchaseToken or productId' }, { status: 400 })
    }
    const tier = SKU_TO_TIER[productId]
    if (!tier) {
        return NextResponse.json({ error: 'Unknown productId' }, { status: 400 })
    }

    // Get an OAuth2 access token for Google Play Developer API
    const serviceAccountB64 = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
    if (!serviceAccountB64) {
        console.error('[billing/verify-android] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not set')
        return NextResponse.json({ error: 'Billing not configured' }, { status: 500 })
    }

    let accessToken: string
    try {
        accessToken = await getGoogleAccessToken(serviceAccountB64)
    } catch (err) {
        console.error('[billing/verify-android] getGoogleAccessToken failed:', err)
        return NextResponse.json({ error: 'Auth with Google failed' }, { status: 500 })
    }

    // Call Google Play Developer API to validate the purchase
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`

    let googleResponse: Response
    try {
        googleResponse = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
    } catch (err) {
        console.error('[billing/verify-android] Google API fetch failed:', err)
        return NextResponse.json({ error: 'Could not reach Google' }, { status: 502 })
    }

    if (!googleResponse.ok) {
        const errorBody = await googleResponse.text().catch(() => '')
        console.error('[billing/verify-android] Google API rejected:', googleResponse.status, errorBody)
        return NextResponse.json({ error: 'Purchase verification failed' }, { status: 400 })
    }

    const purchaseInfo = (await googleResponse.json()) as {
        expiryTimeMillis?: string
        paymentState?: number
        autoRenewing?: boolean
    }

    // paymentState: 0=pending, 1=received, 2=free trial, 3=pending deferred upgrade
    if (purchaseInfo.paymentState !== 1 && purchaseInfo.paymentState !== 2) {
        return NextResponse.json({ error: 'Purchase not in valid state' }, { status: 400 })
    }

    const expiry = purchaseInfo.expiryTimeMillis
        ? new Date(parseInt(purchaseInfo.expiryTimeMillis, 10)).toISOString()
        : null

    // Update subscriptions table. The `id` column is `text primary key` (no
    // default) — use the purchase token as a stable, unique identifier.
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- onConflict on id
    const { error: subError } = await (admin.from as any)('subscriptions').upsert(
        {
            id: purchaseToken,
            user_id: user.id,
            plan: tier,
            product_id: productId,
            status: 'active',
            current_period_end: expiry,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
    )
    if (subError) {
        console.error('[billing/verify-android] subscriptions upsert failed:', subError)
        // Don't fail the response — Google Play already confirmed. Return tier anyway.
    }

    // Update profile tier
    const { error: profileError } = await admin
        .from('profiles')
        .update({ subscription_tier: tier, updated_at: new Date().toISOString() })
        .eq('id', user.id)
    if (profileError) {
        console.error('[billing/verify-android] profile update failed:', profileError)
        return NextResponse.json({ error: 'Could not update tier' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, tier, expiresAt: expiry })
}

/**
 * Mints a short-lived Google OAuth2 access token using the service account's
 * private key. Avoids the googleapis npm package — that's a 5MB dep we don't
 * need just for one token mint. Uses Node's built-in crypto.
 */
async function getGoogleAccessToken(serviceAccountB64: string): Promise<string> {
    const json = JSON.parse(Buffer.from(serviceAccountB64, 'base64').toString('utf8')) as {
        client_email: string
        private_key: string
        token_uri: string
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
        iss: json.client_email,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: json.token_uri,
        iat: now,
        exp: now + 3600,
    }
    const header = { alg: 'RS256', typ: 'JWT' }

    const encode = (obj: object): string =>
        Buffer.from(JSON.stringify(obj)).toString('base64url')
    const signingInput = `${encode(header)}.${encode(payload)}`

    const { createSign } = await import('node:crypto')
    const signer = createSign('RSA-SHA256')
    signer.update(signingInput)
    signer.end()
    const signature = signer.sign(json.private_key).toString('base64url')

    const jwt = `${signingInput}.${signature}`

    const tokenRes = await fetch(json.token_uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
    })
    if (!tokenRes.ok) {
        throw new Error(`Token mint failed: ${tokenRes.status} ${await tokenRes.text()}`)
    }
    const tokenJson = (await tokenRes.json()) as { access_token: string }
    return tokenJson.access_token
}
