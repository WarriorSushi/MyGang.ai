const MEMORY_STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'to',
    'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'is', 'are', 'was',
    'were', 'be', 'been', 'being', 'i', 'you', 'he', 'she', 'they', 'we',
    'me', 'my', 'your', 'our', 'their', 'this', 'that', 'these', 'those',
    'about', 'while', 'into',
])

const CONVERSATION_META_PATTERNS = [
    /^user (asked|requested)\b/i,
    /^user (greeted|said hello|introduced (themself|themselves))\b/i,
    /\b(the gang|the characters?|the assistant|the ai)\b.*\b(replied|responded|answered|said|asked)\b/i,
]

function stemMemoryToken(token: string): string {
    if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3)
    if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2)
    if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2)
    if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1)
    return token
}

function memoryTokens(content: string): Set<string> {
    const tokens = content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length > 2 && !MEMORY_STOPWORDS.has(token))
        .map(stemMemoryToken)
    return new Set(tokens)
}

export function isUsefulMemoryContent(content: string): boolean {
    const normalized = content.trim().replace(/\s+/g, ' ')
    if (normalized.length < 10) return false
    const realWords = normalized.match(/[a-zA-Z\u00C0-\u024F]{3,}/g)
    if (!realWords || realWords.length < 2) return false
    if (/^user asked to be called\b/i.test(normalized)) return true
    return !CONVERSATION_META_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function areLexicallySimilarMemories(a: string, b: string): boolean {
    const normalizedA = a.trim().replace(/\s+/g, ' ').toLowerCase()
    const normalizedB = b.trim().replace(/\s+/g, ' ').toLowerCase()
    if (!normalizedA || !normalizedB) return false
    if (normalizedA === normalizedB) return true

    const tokensA = memoryTokens(normalizedA)
    const tokensB = memoryTokens(normalizedB)
    if (tokensA.size < 3 || tokensB.size < 3) return false

    let shared = 0
    for (const token of tokensA) {
        if (tokensB.has(token)) shared += 1
    }

    const smallerCoverage = shared / Math.min(tokensA.size, tokensB.size)
    const unionSize = new Set([...tokensA, ...tokensB]).size
    const jaccard = unionSize > 0 ? shared / unionSize : 0
    return shared >= 3 && smallerCoverage >= 0.7 && jaccard >= 0.45
}
