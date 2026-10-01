import { describe, expect, it, vi } from 'vitest'
import {
  parseApiAuthSession,
  parseLegacyStoredSession,
  tokensFromApiSession,
} from '@/entities/session/lib/parseSession'

const validLegacySession = {
  user: {
    id: '1',
    login: 'dev',
    name: 'Dev',
    avatarUrl: 'https://example.com/a.png',
    provider: 'github',
  },
  tokens: {
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 60_000,
  },
}

describe('parseLegacyStoredSession', () => {
  it('принимает корректную устаревшую сессию', () => {
    expect(parseLegacyStoredSession(validLegacySession)).toEqual(validLegacySession)
  })

  it.each([{}, { user: { login: 'x' } }, 'строка', [], null])(
    'отклоняет некорректные данные: %j',
    (value) => {
      expect(parseLegacyStoredSession(value)).toBeNull()
    },
  )
})

describe('parseApiAuthSession', () => {
  it('принимает ответ OpenAPI AuthSession', () => {
    expect(parseApiAuthSession({ accessToken: 'a', expiresIn: 3600 })).toEqual({
      accessToken: 'a',
      expiresIn: 3600,
    })
  })

  it('отклоняет некорректный expiresIn', () => {
    expect(parseApiAuthSession({ accessToken: 'a', expiresIn: 0 })).toBeNull()
  })
})

describe('tokensFromApiSession', () => {
  it('считает expiresAt из expiresIn', () => {
    const now = 1_700_000_000_000
    vi.setSystemTime(now)
    expect(tokensFromApiSession({ accessToken: 't', expiresIn: 60 })).toEqual({
      accessToken: 't',
      expiresAt: now + 60_000,
    })
    vi.useRealTimers()
  })
})
