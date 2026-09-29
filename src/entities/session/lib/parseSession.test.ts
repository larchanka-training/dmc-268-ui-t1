import { describe, expect, it } from 'vitest'
import { parseAuthSession } from '@/entities/session/lib/parseSession'

const validSession = {
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

describe('parseAuthSession', () => {
  it('принимает корректную сессию', () => {
    expect(parseAuthSession(validSession)).toEqual(validSession)
  })

  it.each([{}, { user: { login: 'x' } }, 'строка', [], null])(
    'отклоняет некорректные данные: %j',
    (value) => {
      expect(parseAuthSession(value)).toBeNull()
    },
  )
})
