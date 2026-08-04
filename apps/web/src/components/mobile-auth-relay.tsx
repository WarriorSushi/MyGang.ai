'use client'

import { useEffect } from 'react'

import { getMobileAuthDeepLink } from '@/lib/mobile-auth-relay'

export function MobileAuthRelay() {
    useEffect(() => {
        const deepLink = getMobileAuthDeepLink(window.location.href)
        if (deepLink) window.location.replace(deepLink)
    }, [])

    return null
}
