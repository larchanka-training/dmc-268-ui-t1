import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  clearSession,
  loadSession,
  mockRefreshTokens,
  saveSession,
  type AuthSession,
} from '@/entities/session'
import { AuthContext, type AuthContextValue } from '@/features/auth/model/auth-context'
import { USE_MOCK_API } from '@/shared/config/env'

const REFRESH_MARGIN_MS = 15_000

function readInitialSession(): AuthSession | null {
  const stored = loadSession()
  if (!stored) {
    return null
  }
  if (stored.tokens.expiresAt > Date.now()) {
    return stored
  }
  clearSession()
  return null
}

async function refreshSessionTokens(session: AuthSession): Promise<AuthSession> {
  if (USE_MOCK_API) {
    const tokens = await mockRefreshTokens(session.tokens.refreshToken)
    return { ...session, tokens }
  }
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
  })
  if (!response.ok) {
    throw new Error('Token refresh failed')
  }
  const tokens = (await response.json()) as AuthSession['tokens']
  return { ...session, tokens }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readInitialSession)
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
          scheduleRefreshRef.current(next)
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
      isLoading: false,
      loginWithSession,
      logout,
      getAccessToken: () => session?.tokens.accessToken ?? null,
    }),
    [session, loginWithSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
