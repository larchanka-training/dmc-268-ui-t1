import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSession,
  loadPersistedUser,
  savePersistedUser,
} from '@/entities/session/lib/tokenStorage'

const USER_KEY = 'dmc268.auth.user'
const LEGACY_SESSION_KEY = 'dmc268.auth.session'

const user = {
  id: '1',
  login: 'dev',
  name: 'Dev',
  avatarUrl: 'https://example.com/a.png',
  provider: 'github' as const,
}

describe('loadPersistedUser', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('возвращает null и очищает storage при битой записи', () => {
    localStorage.setItem(USER_KEY, JSON.stringify({}))
    expect(loadPersistedUser()).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
  })

  it('восстанавливает валидного пользователя', () => {
    savePersistedUser(user)
    expect(loadPersistedUser()).toEqual(user)
    clearSession()
  })

  it('мигрирует user из устаревшей сессии без токенов', () => {
    localStorage.setItem(
      LEGACY_SESSION_KEY,
      JSON.stringify({
        user,
        tokens: {
          accessToken: 'a',
          refreshToken: 'r',
          expiresAt: Date.now() + 60_000,
        },
      }),
    )
    expect(loadPersistedUser()).toEqual(user)
    expect(localStorage.getItem(LEGACY_SESSION_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).not.toBeNull()
  })
})
