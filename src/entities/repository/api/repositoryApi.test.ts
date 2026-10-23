import { describe, expect, it, vi } from 'vitest'

import { ContractError } from '@/shared/api'
import { fakeTransport } from '@/test/api'
import type { Repository } from '../model/schema'
import type { RepositorySettings, RepositorySettingsUpdate, RulesStatus } from '../model/settings'
import {
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
