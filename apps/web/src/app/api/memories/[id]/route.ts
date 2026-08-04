import { z } from 'zod'
import { getTierFromProfile } from '@mygang/shared'
import { createClientFromRequest } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

const memoryContentSchema = z.object({
    content: z.string().trim().min(1).max(2000),
})

async function getSubscriptionTier(
    supabase: Awaited<ReturnType<typeof createClientFromRequest>>,
    userId: string,
) {
    const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .maybeSingle()

    if (error) {
        console.error('[api/memories] Failed to read tier:', error)
    }

    return getTierFromProfile(data?.subscription_tier ?? null)
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params
    const supabase = await createClientFromRequest(req)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return Response.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }

    const tier = await getSubscriptionTier(supabase, user.id)
    if (tier === 'free') {
        return Response.json({ ok: false, error: 'Memory editing is not available on the free tier.' }, { status: 403 })
    }

    const rate = await rateLimit('api-update-memory:' + user.id, 10, 60_000)
    if (!rate.success) {
        return Response.json({ ok: false, error: 'Too many attempts. Please wait.' }, { status: 429 })
    }

    const body = await req.json().catch(() => null)
    const parsed = memoryContentSchema.safeParse(body)
    if (!parsed.success) {
        return Response.json(
            { ok: false, error: parsed.error.issues[0]?.message || 'Invalid memory content.' },
            { status: 400 },
        )
    }

    const { generateEmbedding } = await import('@/lib/ai/memory')
    let embedding: number[]
    try {
        embedding = await generateEmbedding(parsed.data.content)
    } catch (err) {
        console.error('[api/memories] Failed to generate embedding:', err)
        return Response.json({ ok: false, error: 'Unable to update memory right now.' }, { status: 500 })
    }

    const { error } = await supabase
        .from('memories')
        .update({
            content: parsed.data.content,
            embedding: embedding as unknown as string,
        })
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        console.error('[api/memories] Failed to update memory:', error)
        return Response.json({ ok: false, error: 'Failed to update memory. Please try again.' }, { status: 500 })
    }

    return Response.json({ ok: true, content: parsed.data.content })
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params
    const supabase = await createClientFromRequest(req)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return Response.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }

    const tier = await getSubscriptionTier(supabase, user.id)
    if (tier === 'free') {
        return Response.json({ ok: false, error: 'Memory editing is not available on the free tier.' }, { status: 403 })
    }

    const rate = await rateLimit('api-delete-memory:' + user.id, 20, 60_000)
    if (!rate.success) {
        return Response.json({ ok: false, error: 'Too many attempts. Please wait.' }, { status: 429 })
    }

    const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        console.error('[api/memories] Failed to delete memory:', error)
        return Response.json({ ok: false, error: 'Failed to delete memory. Please try again.' }, { status: 500 })
    }

    return Response.json({ ok: true })
}
