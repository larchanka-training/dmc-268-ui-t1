import { describe, expect, it, vi } from 'vitest'

import { ApiError, ContractError } from '@/shared/api'
import { fakeTransport } from '@/test/api'
import type { Repository } from '../model/schema'
import type { RepositorySettings, RepositorySettingsUpdate, RulesStatus } from '../model/settings'
import {
  fetchRepositories,
  fetchRepository,
  fetchRepositorySettings,
  fetchRulesStatus,
  repositoryPath,
  repositoryRulesPath,
  repositorySettingsPath,
  saveRepositorySettings,
} from './repositoryApi'

const SETTINGS: RepositorySettings = {
  auto_review_enabled: false,
  branch_filter: ['docs/**'],
  min_severity: 'critical',
}

const REPOSITORY: Repository = {
  id: 'repo-1',
  provider: 'github',
  provider_id: '101',
  full_name: 'larchanka-training/platform-api',
  default_branch: 'main',
  auto_review_enabled: true,
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
}

const RULES: RulesStatus = { status: 'absent', branch: 'main', path: '.review/rules.md' }

describe('fetch-функции блока настроек', () => {
  it('репозиторий идёт своей ручкой и проходит схему', async () => {
    const get = vi.fn(async () => structuredClone(REPOSITORY))

    await expect(fetchRepository(fakeTransport({ get }), 'repo-1')).resolves.toEqual(REPOSITORY)
    expect(get).toHaveBeenCalledWith(repositoryPath('repo-1'))
  })

  it('настройки идут своим путём и проходят схему', async () => {
    const get = vi.fn(async () => structuredClone(SETTINGS))

    await expect(fetchRepositorySettings(fakeTransport({ get }), 'repo-1')).resolves.toEqual(
      SETTINGS,
    )
    expect(get).toHaveBeenCalledWith(repositorySettingsPath('repo-1'))
  })

  it('статус правил идёт своим путём и проходит схему', async () => {
    const get = vi.fn(async () => structuredClone(RULES))

    await expect(fetchRulesStatus(fakeTransport({ get }), 'repo-2')).resolves.toMatchObject({
      status: 'absent',
    })
    expect(get).toHaveBeenCalledWith(repositoryRulesPath('repo-2'))
  })
})

describe('saveRepositorySettings', () => {
  it('сохраняет PUT-ом полную замену и возвращает записанное', async () => {
    const put = vi.fn(async () => structuredClone(SETTINGS))
    const post = vi.fn(async () => structuredClone(SETTINGS))
    const draft: RepositorySettingsUpdate = SETTINGS

    await expect(
      saveRepositorySettings(fakeTransport({ put, post }), 'repo-2', draft),
    ).resolves.toEqual(SETTINGS)
    expect(put).toHaveBeenCalledWith(repositorySettingsPath('repo-2'), draft)
    expect(post).not.toHaveBeenCalled()
  })
})

describe('валидация на границе', () => {
  it('репозиторий вне схемы не доходит до UI', async () => {
    const transport = fakeTransport({ get: async () => ({ id: 'repo-1', full_name: 42 }) })

    await expect(fetchRepository(transport, 'repo-1')).rejects.toBeInstanceOf(ContractError)
  })

  it('настройки вне схемы не доходит до UI', async () => {
    const transport = fakeTransport({ get: async () => ({ auto_review_enabled: 'yes' }) })

    await expect(fetchRepositorySettings(transport, 'repo-1')).rejects.toBeInstanceOf(ContractError)
  })

  it('статус правил вне схемы не доходит до UI', async () => {
    const transport = fakeTransport({ get: async () => ({ status: 'half-loaded' }) })

    await expect(fetchRulesStatus(transport, 'repo-1')).rejects.toBeInstanceOf(ContractError)
  })
})

describe('fetchRepositories', () => {
  const row = (n: number) => ({
    provider: 'github',
    provider_id: String(n),
    full_name: `acme/repo-${String(n).padStart(3, '0')}`,
    default_branch: 'main',
    connected: false,
    id: null,
    can_connect: true,
    connected_at: null,
  })

  it('больше 200: страницы по offset, пока страница полная; install_url — из первой', async () => {
    const all = Array.from({ length: 250 }, (_, n) => row(n + 1))
    const get = vi.fn(async (path: string) => {
      const offset = Number(new URLSearchParams(path.split('?')[1]).get('offset'))
      return {
        items: all.slice(offset, offset + 200),
        install_url: offset === 0 ? 'https://github.com/apps/x/installations/new' : null,
      }
    })

    const list = await fetchRepositories(fakeTransport({ get }))

    expect(list.items).toHaveLength(250)
    expect(list.install_url).toBe('https://github.com/apps/x/installations/new')
    expect(get.mock.calls.map(([path]) => path)).toEqual([
      '/repositories?limit=200&offset=0',
      '/repositories?limit=200&offset=200',
    ])
  })

  it('ровно 200: следующая страница пустая — конец списка', async () => {
    const get = vi.fn(async (path: string) => ({
      items: path.endsWith('offset=0') ? Array.from({ length: 200 }, (_, n) => row(n + 1)) : [],
      install_url: null,
    }))

    expect((await fetchRepositories(fakeTransport({ get }))).items).toHaveLength(200)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('упала вторая страница: ошибка всего запроса, а не неполный список', async () => {
    const get = vi.fn(async (path: string) => {
      if (path.endsWith('offset=200')) throw new ApiError(502, 'GitHub не ответил')
      return { items: Array.from({ length: 200 }, (_, n) => row(n + 1)), install_url: null }
    })

    await expect(fetchRepositories(fakeTransport({ get }))).rejects.toBeInstanceOf(ApiError)
  })

  it('бэкенд игнорирует offset: не больше 50 страниц', async () => {
    const get = vi.fn(async () => ({
      items: Array.from({ length: 200 }, (_, n) => row(n + 1)),
      install_url: null,
    }))

    await fetchRepositories(fakeTransport({ get }))

    expect(get).toHaveBeenCalledTimes(50)
  })
})
