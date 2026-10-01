import { parseAuthUser, parseLegacyStoredSession } from '@/entities/session/lib/parseSession'
import type { AuthUser } from '@/entities/session/model/types'

const USER_KEY = 'dmc268.auth.user'
const LEGACY_SESSION_KEY = 'dmc268.auth.session'

function migrateLegacySession(): void {
  const raw = localStorage.getItem(LEGACY_SESSION_KEY)
  if (!raw) {
    return
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    const legacy = parseLegacyStoredSession(parsed)
    if (legacy?.user && !localStorage.getItem(USER_KEY)) {
      savePersistedUser(legacy.user)
    }
  } catch {
    // ignore
  } finally {
    localStorage.removeItem(LEGACY_SESSION_KEY)
  }
}

export function loadPersistedUser(): AuthUser | null {
  migrateLegacySession()
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    const user = parseAuthUser(parsed)
    if (!user) {
      clearPersistedUser()
      return null
    }
    return user
  } catch {
    clearPersistedUser()
    return null
  }
}

export function savePersistedUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearPersistedUser(): void {
  localStorage.removeItem(USER_KEY)
}

export function clearSession(): void {
  clearPersistedUser()
  localStorage.removeItem(LEGACY_SESSION_KEY)
}

/** @deprecated Используйте loadPersistedUser; оставлено для совместимости тестов/миграции */
export function loadSession(): null {
  migrateLegacySession()
  return null
}

/** Сохраняет только профиль; access-токен держится в памяти вкладки (React state). */
export function saveSession(session: { user: AuthUser }): void {
  savePersistedUser(session.user)
}
