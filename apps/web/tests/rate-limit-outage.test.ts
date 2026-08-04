async function main() {
    process.env.UPSTASH_REDIS_REST_URL = 'http://127.0.0.1:1'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'unreachable-test-token'

    const { rateLimit } = await import('../src/lib/rate-limit')
    const result = await rateLimit(`outage-test:${Date.now()}`, 3, 60_000)

    if (!result.success || result.remaining !== 2) {
        console.error('  FAIL: Redis outage should retain a bounded in-memory limiter')
        process.exit(1)
    }

    console.log('  PASS: Redis outage retains a bounded in-memory limiter')
}

void main()
