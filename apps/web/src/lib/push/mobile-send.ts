import { createAdminClient } from '@/lib/supabase/admin'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type ExpoPushMessage = {
  to: string
  sound?: 'default' | null
  title?: string
  body?: string
  data?: Record<string, unknown>
  channelId?: string
}

type ExpoPushResponse = {
  data?: Array<
    | { status: 'ok'; id: string }
    | { status: 'error'; message: string; details?: { error?: string } }
  >
  errors?: Array<{ code?: string; message: string }>
}

/**
 * Fire a "your gang has been chatting" push to all of a user's mobile devices.
 * Fail-soft: any errors are logged but never thrown — push failure must not
 * break the WYWA batch.
 *
 * Note: Expo's Push API documents that DeviceNotRegistered errors should
 * trigger token cleanup. We do that opportunistically here (delete the bad
 * token) so the table doesn't accumulate stale entries.
 */
export async function sendMobileWywaTeaser(userId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: tokens, error } = await admin
      .from('mobile_push_tokens')
      .select('id, expo_push_token')
      .eq('user_id', userId)

    if (error) {
      console.warn('[mobile-push] failed to fetch tokens:', error)
      return
    }
    if (!tokens || tokens.length === 0) return

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      sound: 'default',
      title: 'Your gang is online',
      body: "They've been chatting while you were away.",
      data: { route: '/(app)/chat' },
      channelId: 'default',
    }))

    let response: Response
    try {
      response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'accept-encoding': 'gzip, deflate',
          'content-type': 'application/json',
        },
        body: JSON.stringify(messages),
      })
    } catch (err) {
      console.warn('[mobile-push] expo fetch failed:', err)
      return
    }

    if (!response.ok) {
      console.warn(
        `[mobile-push] expo returned ${response.status}: ${await response.text().catch(() => '')}`
      )
      return
    }

    let json: ExpoPushResponse
    try {
      json = (await response.json()) as ExpoPushResponse
    } catch {
      console.warn('[mobile-push] expo response was not JSON')
      return
    }

    // Opportunistic cleanup: delete tokens Expo says are dead.
    const tokensToDelete: string[] = []
    json.data?.forEach((result, i) => {
      if (
        result.status === 'error' &&
        result.details?.error === 'DeviceNotRegistered'
      ) {
        const t = tokens[i]?.id
        if (t) tokensToDelete.push(t)
      }
    })
    if (tokensToDelete.length > 0) {
      const { error: delErr } = await admin
        .from('mobile_push_tokens')
        .delete()
        .in('id', tokensToDelete)
      if (delErr) {
        console.warn('[mobile-push] failed to clean up dead tokens:', delErr)
      }
    }
  } catch (err) {
    console.warn('[mobile-push] sendMobileWywaTeaser unexpected error:', err)
  }
}
