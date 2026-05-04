import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rate = await rateLimit(`mobile-push:${user.id}`, 30, 60_000)
  if (!rate.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: { expo_push_token?: string; platform?: string; device_id?: string; app_version?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { expo_push_token, platform, device_id, app_version } = body
  if (!expo_push_token || !platform) {
    return NextResponse.json({ error: 'Missing expo_push_token or platform' }, { status: 400 })
  }
  if (platform !== 'ios' && platform !== 'android') {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }
  // Expo tokens look like ExponentPushToken[abc123...] — basic sanity check
  if (!expo_push_token.startsWith('ExponentPushToken[') || expo_push_token.length > 200) {
    return NextResponse.json({ error: 'Invalid Expo push token format' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('mobile_push_tokens')
    .upsert(
      {
        user_id: user.id,
        expo_push_token,
        platform,
        device_id: device_id ?? null,
        app_version: app_version ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_push_token' }
    )
    .select('id')
    .single()

  if (error) {
    console.error('[mobile-push register] upsert error:', error)
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { expo_push_token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { expo_push_token } = body
  if (!expo_push_token) {
    return NextResponse.json({ error: 'Missing expo_push_token' }, { status: 400 })
  }

  const { error } = await supabase
    .from('mobile_push_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('expo_push_token', expo_push_token)

  if (error) {
    console.error('[mobile-push register] delete error:', error)
    return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
