import { parseAuthSession } from '@/entities/session/lib/parseSession'
import type { AuthSession } from '@/entities/session/model/types'

const SESSION_KEY = 'dmc268.auth.session'

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    const session = parseAuthSession(parsed)
    if (!session) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
