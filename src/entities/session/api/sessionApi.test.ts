import { afterEach, describe, expect, it, vi } from 'vitest'

import { MOCK_USER } from '../../../build/mockAuth'

import { currentUserSchema, fetchCurrentUser } from '@/entities/session/api/sessionApi'
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

// TEST_PLAN: фикстуры проходят ту же схему, что и ответ API, — иначе мок
// dev-сервера или тестов молча разойдётся с контрактом бэкенда.
describe('фикстуры /auth/me', () => {
  it.each([
    ['мок dev-сервера', MOCK_USER],
    ['фикстура тестов', ME],
  ])('%s соответствует схеме ответа', (_, fixture) => {
    expect(currentUserSchema.safeParse(fixture).success).toBe(true)
  })
})
