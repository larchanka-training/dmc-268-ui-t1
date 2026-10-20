import { describe, expect, it, vi } from 'vitest'

import { ContractError } from '@/shared/api'
import { fakeTransport } from '@/test/api'
import type { RepositorySettings } from '../model/settings'
import {
  fetchRepositoryHistory,
  fetchRepositorySettings,
  fetchRulesStatus,
  repositoryHistoryPath,
  repositoryRulesPath,
  repositorySettingsPath,
  saveRepositorySettings,
} from './repositoryApi'

const SETTINGS: RepositorySettings = {
  autoReviewEnabled: false,
  branchFilter: ['docs/**'],
  minSeverity: 'critical',
}

describe('fetch-функции блока настроек', () => {
  it('настройки идут своим путём и проходят схему', async () => {
    const get = vi.fn(async () => structuredClone(SETTINGS))

    await expect(fetchRepositorySettings(fakeTransport({ get }), 'repo-1')).resolves.toEqual(
      SETTINGS,
    )
    expect(get).toHaveBeenCalledWith(repositorySettingsPath('repo-1'))
  })

  it('статус правил идёт своим путём и проходит схему', async () => {
    const get = vi.fn(async () => ({ status: 'absent', branch: 'main', path: '.review/rules.md' }))

    await expect(fetchRulesStatus(fakeTransport({ get }), 'repo-2')).resolves.toMatchObject({
      status: 'absent',
    })
    expect(get).toHaveBeenCalledWith(repositoryRulesPath('repo-2'))
  })

  it('история идёт своим путём и проходит схему', async () => {
    const get = vi.fn(async () => [])

    await expect(fetchRepositoryHistory(fakeTransport({ get }), 'repo-2')).resolves.toEqual([])
    expect(get).toHaveBeenCalledWith(repositoryHistoryPath('repo-2'))
  })
})

describe('saveRepositorySettings', () => {
  it('постит настройки своим путём и возвращает записанное', async () => {
    const post = vi.fn(async () => structuredClone(SETTINGS))

    await expect(
      saveRepositorySettings(fakeTransport({ post }), 'repo-2', SETTINGS),
    ).resolves.toEqual(SETTINGS)
    expect(post).toHaveBeenCalledWith(repositorySettingsPath('repo-2'), SETTINGS)
  })
})

describe('валидация на границе', () => {
  it('настройки вне схемы не доходят до UI', async () => {
    const transport = fakeTransport({ get: async () => ({ autoReviewEnabled: 'yes' }) })

    await expect(fetchRepositorySettings(transport, 'repo-1')).rejects.toBeInstanceOf(ContractError)
  })

  it('статус правил вне схемы не доходит до UI', async () => {
    const transport = fakeTransport({ get: async () => ({ status: 'half-loaded' }) })

    await expect(fetchRulesStatus(transport, 'repo-1')).rejects.toBeInstanceOf(ContractError)
  })

  it('история вне схемы не доходит до UI', async () => {
    const transport = fakeTransport({ get: async () => [{ status: 42 }] })

    await expect(fetchRepositoryHistory(transport, 'repo-1')).rejects.toBeInstanceOf(ContractError)
  })
})
