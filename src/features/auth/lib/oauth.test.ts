import { beforeEach, describe, expect, it } from 'vitest'
import { completeOAuthCallback } from '@/features/auth/lib/oauth'

describe('completeOAuthCallback', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('отклоняет неверный state', async () => {
    sessionStorage.setItem('dmc268.oauth.state', 'expected')
    sessionStorage.setItem('dmc268.oauth.provider', 'github')
    await expect(completeOAuthCallback('mock_github_auth_code', 'wrong')).rejects.toThrow(
      'Неверный параметр OAuth state',
    )
  })
})
