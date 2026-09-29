import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, loadSession, saveSession } from '@/entities/session/lib/tokenStorage'

const SESSION_KEY = 'dmc268.auth.session'

describe('loadSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('возвращает null и очищает storage при битой записи', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({}))
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('восстанавливает валидную сессию', () => {
    const session = {
      user: {
        id: '1',
        login: 'dev',
        name: 'Dev',
        avatarUrl: 'https://example.com/a.png',
        provider: 'github' as const,
      },
      tokens: {
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: Date.now() + 60_000,
      },
    }
    saveSession(session)
    expect(loadSession()).toEqual(session)
    clearSession()
  })
})
