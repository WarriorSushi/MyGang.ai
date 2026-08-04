import { getMobileAuthDeepLink } from '../src/lib/mobile-auth-relay'

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
    if (condition) {
        console.log(`  PASS: ${label}`)
        passed++
    } else {
        console.error(`  FAIL: ${label}`)
        failed++
    }
}

console.log('\n1. Ignores ordinary landing-page URLs')
assert(
    getMobileAuthDeepLink('https://mygang.ai/') === null,
    'normal landing visit is untouched',
)

console.log('\n2. Relays OAuth tokens into the app')
{
    const hash = '#access_token=access-123&refresh_token=refresh-456&token_type=bearer'
    assert(
        getMobileAuthDeepLink(`https://mygang.ai/${hash}`) ===
            `mygang://auth/callback${hash}`,
        'OAuth hash is preserved exactly',
    )
}

console.log('\n3. Relays password recovery into the reset screen')
{
    const hash = '#access_token=access-123&refresh_token=refresh-456&type=recovery'
    assert(
        getMobileAuthDeepLink(`https://mygang.ai/${hash}`) ===
            `mygang://reset-password${hash}`,
        'recovery hash targets the reset-password route',
    )
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
