import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@mygang/shared/database/types'

export async function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }

    const cookieStore = await cookies()

    return createServerClient<Database>(
        url,
        anonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

/**
 * Create a Supabase client from an incoming Request.
 *
 * Auth resolution order:
 *   1. If `Authorization: Bearer <jwt>` is present (mobile clients), use it.
 *   2. Otherwise fall back to cookies (web).
 *
 * Use this in API route handlers that need to accept BOTH browser-cookie
 * traffic from the web app AND mobile traffic from the React Native app.
 */
export async function createClientFromRequest(request: Request) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

    if (bearerToken) {
        // Mobile path: stateless client that forwards the user's JWT to
        // Supabase on every call. RLS policies see the user's id correctly.
        return createSupabaseClient<Database>(url, anonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
            global: {
                headers: { Authorization: `Bearer ${bearerToken}` },
            },
        })
    }

    // Web path: fall back to cookie-based SSR client.
    return createClient()
}
