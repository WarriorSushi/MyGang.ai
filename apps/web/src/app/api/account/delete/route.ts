import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Permanently deletes the authenticated user and all of their data.
 *
 * Auth: Supabase cookie (web) OR Authorization: Bearer <access_token> (mobile).
 * createClientFromRequest handles both transparently.
 *
 * Order: child rows first → profiles → auth.users last. We delete explicitly
 * across known per-user tables to avoid relying on FK CASCADE rules that may
 * vary across schema versions.
 *
 * If new per-user tables are added (e.g., user_preferences, sessions), append
 * them to TABLES_TO_PURGE.
 */
const TABLES_TO_PURGE = [
    'memories',
    'chat_history',
    'gang_members',
    'gangs',
    'push_subscriptions',
    'mobile_push_tokens',
    'squad_tier_members',
    'subscriptions',
] as const

export async function POST(request: Request) {
    const supabase = await createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = user.id
    const admin = createAdminClient()

    for (const table of TABLES_TO_PURGE) {
        // gang_members has no user_id column — it cascades from gangs. We
        // delete via the user's gang ids first to avoid an orphaned-row race.
        if (table === 'gang_members') {
            const { data: userGangs, error: gangFetchError } = await admin
                .from('gangs')
                .select('id')
                .eq('user_id', userId)
            if (gangFetchError) {
                console.error('[account/delete] fetching gangs failed:', gangFetchError)
                return NextResponse.json(
                    { error: `Failed to fetch gangs: ${gangFetchError.message}` },
                    { status: 500 },
                )
            }
            const gangIds = (userGangs ?? []).map((g) => g.id)
            if (gangIds.length > 0) {
                const { error } = await admin
                    .from('gang_members')
                    .delete()
                    .in('gang_id', gangIds)
                if (error) {
                    console.error('[account/delete] purging gang_members failed:', error)
                    return NextResponse.json(
                        { error: `Failed to purge gang_members: ${error.message}` },
                        { status: 500 },
                    )
                }
            }
            continue
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mobile_push_tokens
        // is not yet in the generated Database type until the migration is
        // applied and types are regenerated. Cast through any to avoid a
        // build-time narrowing error; runtime behavior is unchanged.
        const { error } = await (admin.from as any)(table).delete().eq('user_id', userId)
        if (error) {
            console.error(`[account/delete] purging ${table} failed:`, error)
            return NextResponse.json(
                { error: `Failed to purge ${table}: ${error.message}` },
                { status: 500 },
            )
        }
    }

    // profiles.id IS the user id (not a separate user_id column).
    const { error: profileError } = await admin.from('profiles').delete().eq('id', userId)
    if (profileError) {
        console.error('[account/delete] purging profile failed:', profileError)
        return NextResponse.json(
            { error: `Failed to purge profile: ${profileError.message}` },
            { status: 500 },
        )
    }

    // Final step: delete auth user. Invalidates all sessions.
    const { error: authError } = await admin.auth.admin.deleteUser(userId)
    if (authError) {
        console.error('[account/delete] auth.admin.deleteUser failed:', authError)
        return NextResponse.json(
            { error: `Failed to delete auth user: ${authError.message}` },
            { status: 500 },
        )
    }

    return NextResponse.json({ ok: true })
}
