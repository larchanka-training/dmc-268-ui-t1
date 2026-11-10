import { afterEach, describe, expect, it, vi } from 'vitest'

import { currentUserSchema, fetchCurrentUser } from '@/entities/session/api/sessionApi'
import { ContractError } from '@/shared/api'
import { ME, stubFetch } from '@/test/api'

describe('fetchCurrentUser', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('переводит ответ /auth/me в CurrentUser', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    await expect(fetchCurrentUser()).resolves.toEqual({
      id: ME.id,
      provider: 'github',
      login: 'octocat',
      name: 'The Octocat',
      avatarUrl: ME.avatar_url,
      balanceEur: '4.75',
      paidRepositories: [],
    })
  })

  it('баланс — строка как есть, оплачиваемые репозитории — в camelCase', async () => {
    stubFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: {
          ...ME,
          balance_eur: '-0.0100000001',
          paid_repositories: [{ id: 'repo-1', full_name: 'acme/api' }],
        },
      },
    })

    await expect(fetchCurrentUser()).resolves.toMatchObject({
      balanceEur: '-0.0100000001',
      paidRepositories: [{ id: 'repo-1', fullName: 'acme/api' }],
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
  it('фикстура тестов соответствует схеме ответа', () => {
    expect(currentUserSchema.safeParse(ME).success).toBe(true)
  })
})
