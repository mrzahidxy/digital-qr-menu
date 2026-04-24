'use client'

import { env } from '@/config/env'

const AUTH_STORAGE_PATTERN =
  /(^|[-_.])(next-auth|authjs|auth|token|session|accessToken|refreshToken)([-_.]|$)/i

const KNOWN_AUTH_COOKIE_PREFIXES = ['next-auth', '__Secure-next-auth', 'authjs', '__Secure-authjs']

let inFlightLogout: Promise<void> | null = null

function clearAuthStorageBucket(storage: Storage | undefined) {
  if (!storage) return

  const keys: string[] = []
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key) keys.push(key)
    }
  } catch {
    return
  }

  keys.forEach((key) => {
    try {
      if (AUTH_STORAGE_PATTERN.test(key)) {
        storage.removeItem(key)
      }
    } catch {
      // Ignore storage access errors.
    }
  })
}

function expireCookie(name: string) {
  const escapedName = encodeURIComponent(name)
  document.cookie = `${escapedName}=; Max-Age=0; path=/; SameSite=Lax`
}

function clearAuthCookies() {
  if (typeof document === 'undefined') return

  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter(Boolean)

  cookieNames.forEach((name) => {
    if (
      KNOWN_AUTH_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)) ||
      AUTH_STORAGE_PATTERN.test(name)
    ) {
      expireCookie(name)
    }
  })
}

async function revokeApiSession() {
  if (typeof window === 'undefined') return

  const logoutUrl = new URL('/api/v1/auth/logout', env.NEXT_PUBLIC_API_BASE_URL).toString()
  try {
    await fetch(logoutUrl, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Best effort only.
  }
}

export function clearClientAuthData() {
  if (typeof window === 'undefined') return

  clearAuthStorageBucket(window.localStorage)
  clearAuthStorageBucket(window.sessionStorage)
  clearAuthCookies()
}

export async function forceLogout(reason: 'expired' | 'unauthorized' = 'expired') {
  if (typeof window === 'undefined') return
  if (inFlightLogout) return inFlightLogout

  inFlightLogout = (async () => {
    await revokeApiSession()
    clearClientAuthData()

    try {
      const { signOut } = await import('next-auth/react')
      await signOut({ redirect: false })
    } catch {
      // Continue with local cleanup + redirect.
    }

    clearClientAuthData()

    const loginUrl = new URL('/login', window.location.origin)
    loginUrl.searchParams.set('reason', reason)
    if (!window.location.pathname.startsWith('/login')) {
      window.location.replace(loginUrl.toString())
    }
  })().finally(() => {
    inFlightLogout = null
  })

  return inFlightLogout
}
