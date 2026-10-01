import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  clearSession,
  mockRefreshTokens,
  refreshAccessToken,
  restoreSession,
  saveSession,
  type AuthSession,
} from '@/entities/session'
import { AuthContext, type AuthContextValue } from '@/features/auth/model/auth-context'
import { USE_MOCK_API } from '@/shared/config/env'

const REFRESH_MARGIN_MS = 15_000

async function refreshSessionTokens(session: AuthSession): Promise<AuthSession> {
  if (USE_MOCK_API) {
    const tokens = await mockRefreshTokens(session.tokens.refreshToken)
    return { ...session, tokens }
  }
  const tokens = await refreshAccessToken()
  return { ...session, tokens }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef<number | null>(null)
  const scheduleRefreshRef = useRef<(current: AuthSession) => void>(() => {})

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const scheduleRefresh = useCallback(
    (current: AuthSession) => {
      clearRefreshTimer()
      const msUntilRefresh = current.tokens.expiresAt - Date.now() - REFRESH_MARGIN_MS
      const delay = Math.max(msUntilRefresh, 1000)

      refreshTimerRef.current = window.setTimeout(async () => {
        try {
          const next = await refreshSessionTokens(current)
          setSession(next)
          saveSession(next)
        } catch {
          clearSession()
          setSession(null)
        }
      }, delay)
    },
    [clearRefreshTimer],
  )

  useEffect(() => {
    scheduleRefreshRef.current = scheduleRefresh
  }, [scheduleRefresh])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const restored = await restoreSession()
        if (!cancelled) {
          setSession(restored)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loginWithSession = useCallback((next: AuthSession) => {
    setSession(next)
    saveSession(next)
  }, [])

  const logout = useCallback(() => {
    clearRefreshTimer()
    clearSession()
    setSession(null)
  }, [clearRefreshTimer])

  useEffect(() => {
    if (session) {
      scheduleRefreshRef.current(session)
    }
    return clearRefreshTimer
  }, [clearRefreshTimer, session])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      isLoading,
      loginWithSession,
      logout,
      getAccessToken: () => session?.tokens.accessToken ?? null,
    }),
    [session, isLoading, loginWithSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
