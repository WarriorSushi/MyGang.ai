/**
 * Supabase falls back to the configured Site URL when a native redirect is not
 * allowlisted. Mobile auth deliberately uses that stable HTTPS URL, then the
 * landing page relays the returned session hash into the installed app.
 */
export function getMobileAuthDeepLink(href: string): string | null {
    let url: URL
    try {
        url = new URL(href)
    } catch {
        return null
    }

    if (!url.hash) return null

    const params = new URLSearchParams(url.hash.slice(1))
    if (!params.get('access_token') || !params.get('refresh_token')) {
        return null
    }

    const path = params.get('type') === 'recovery'
        ? 'reset-password'
        : 'auth/callback'

    return `mygang://${path}${url.hash}`
}
