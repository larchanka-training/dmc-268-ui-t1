import { afterEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import { fetchCurrentUser } from '@/entities/session'
import { ContractError } from '@/shared/api'
import { ME, stubFetch } from '@/test/api'

describe('fetchCurrentUser', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('переводит ответ /auth/me в CurrentUser', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    await expect(fetchCurrentUser()).resolves.toEqual({
      provider: 'github',
      login: 'octocat',
      name: 'The Octocat',
      avatarUrl: ME.avatar_url,
    })
  })

  it('пропускает профиль без имени и аватара', async () => {
    stubFetch({
      'GET /api/v1/auth/me': { status: 200, body: { ...ME, name: null, avatar_url: null } },
    })

    await expect(fetchCurrentUser()).resolves.toMatchObject({ name: null, avatarUrl: null })
  })

  it('ответ без логина — ошибка контракта, а не вход', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: { ...ME, login: undefined } } })

    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(ContractError)
  })
})
