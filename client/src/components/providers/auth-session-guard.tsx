'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { forceLogout } from '@/lib/auth/session-cleanup'

const WARNING_WINDOW_MS = 60 * 1000

function resolveExpiryMs(session: ReturnType<typeof useSession>['data']) {
  const expiresAt = session?.accessTokenExpiresAt
  return typeof expiresAt === 'number' ? expiresAt : null
}

export function AuthSessionGuard() {
  const { data: session, status } = useSession()
  const warningShownFor = useRef<number | null>(null)

  const expiryMs = useMemo(() => resolveExpiryMs(session), [session])
  const sessionIsExpired =
    session?.accessTokenExpired === true || (typeof expiryMs === 'number' && Date.now() >= expiryMs)

  useEffect(() => {
    if (status !== 'authenticated') {
      warningShownFor.current = null
      return
    }

    if (sessionIsExpired) {
      void forceLogout('expired')
      return
    }

    if (!expiryMs) return

    const timeUntilExpiry = expiryMs - Date.now()
    const warningDelay = Math.max(0, timeUntilExpiry - WARNING_WINDOW_MS)
    const shouldWarnImmediately = timeUntilExpiry <= WARNING_WINDOW_MS

    const warningTimeout = window.setTimeout(() => {
      if (warningShownFor.current === expiryMs) return
      warningShownFor.current = expiryMs
      toast.warning('Your session will expire soon. You will be logged out automatically.')
    }, shouldWarnImmediately ? 0 : warningDelay)

    const expiryTimeout = window.setTimeout(() => {
      void forceLogout('expired')
    }, Math.max(0, timeUntilExpiry))

    return () => {
      window.clearTimeout(warningTimeout)
      window.clearTimeout(expiryTimeout)
    }
  }, [expiryMs, sessionIsExpired, status])

  useEffect(() => {
    const checkNow = () => {
      if (typeof expiryMs !== 'number') return
      if (Date.now() >= expiryMs) {
        void forceLogout('expired')
      }
    }

    window.addEventListener('focus', checkNow)
    document.addEventListener('visibilitychange', checkNow)

    return () => {
      window.removeEventListener('focus', checkNow)
      document.removeEventListener('visibilitychange', checkNow)
    }
  }, [expiryMs])

  return null
}
