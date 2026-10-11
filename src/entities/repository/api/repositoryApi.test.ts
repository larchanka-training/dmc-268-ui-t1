import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ContractError } from '@/shared/api'
import type { RepositorySettings } from '../model/settings'
import * as store from './mockStore'
import {
  fetchRepositoryHistory,
  fetchRepositorySettings,
  fetchRulesStatus,
  saveRepositorySettings,
} from './repositoryApi'

// Заглушки поверх реальных функций store: по умолчанию — сквозной вызов,
// в тестах контракта — подмена ответа данными вне схемы.
vi.mock('./mockStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./mockStore')>()
  return {
    ...actual,
    getRepositorySettings: vi.fn(actual.getRepositorySettings),
    getRulesStatus: vi.fn(actual.getRulesStatus),
    getRepositoryHistory: vi.fn(actual.getRepositoryHistory),
  }
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('fetch-функции настроек', () => {
  it('настройки приходят из store после задержки', async () => {
    const promise = fetchRepositorySettings('repo-1')

    await vi.advanceTimersByTimeAsync(349)
    await expect(Promise.race([promise, Promise.resolve('pending')])).resolves.toBe('pending')
    await vi.advanceTimersByTimeAsync(1)
    await expect(promise).resolves.toEqual(store.getRepositorySettings('repo-1'))
  })

  it('статус правил repo-2 сообщает, что файла нет', async () => {
    const promise = fetchRulesStatus('repo-2')

    await vi.advanceTimersByTimeAsync(350)
    await expect(promise).resolves.toMatchObject({ present: false })
  })

  it('история repo-2 пуста', async () => {
    const promise = fetchRepositoryHistory('repo-2')

    await vi.advanceTimersByTimeAsync(350)
    await expect(promise).resolves.toEqual([])
  })
})

describe('saveRepositorySettings', () => {
  it('сохраняет настройки и отдаёт записанное', async () => {
    const draft: RepositorySettings = {
      autoReviewEnabled: false,
      branchFilter: ['release/**'],
      severityThreshold: 'critical_only',
    }

    const saving = saveRepositorySettings('repo-2', draft)
    await vi.advanceTimersByTimeAsync(500)
    await expect(saving).resolves.toEqual(draft)

    const reread = fetchRepositorySettings('repo-2')
    await vi.advanceTimersByTimeAsync(350)
    await expect(reread).resolves.toEqual(draft)
  })

  it('не записывает в store данные вне схемы', async () => {
    const before = store.getRepositorySettings('repo-1')
    const invalid = { autoReviewEnabled: 'yes' } as unknown as RepositorySettings

    const expectation = expect(saveRepositorySettings('repo-1', invalid)).rejects.toBeInstanceOf(
      ContractError,
    )
    await vi.advanceTimersByTimeAsync(500)
    await expectation

    expect(store.getRepositorySettings('repo-1')).toEqual(before)
  })
})

describe('валидация на границе', () => {
  it('настройки вне схемы не доходят до UI', async () => {
    vi.mocked(store.getRepositorySettings).mockReturnValueOnce({
      autoReviewEnabled: 'yes',
    } as unknown as RepositorySettings)

    const expectation = expect(fetchRepositorySettings('repo-1')).rejects.toBeInstanceOf(
      ContractError,
    )
    await vi.advanceTimersByTimeAsync(350)
    await expectation
  })

  it('статус правил вне схемы не доходит до UI', async () => {
    vi.mocked(store.getRulesStatus).mockReturnValueOnce({ present: 'maybe' } as never)

    const expectation = expect(fetchRulesStatus('repo-1')).rejects.toBeInstanceOf(ContractError)
    await vi.advanceTimersByTimeAsync(350)
    await expectation
  })

  it('история вне схемы не доходит до UI', async () => {
    vi.mocked(store.getRepositoryHistory).mockReturnValueOnce([{ status: 42 }] as never)

    const expectation = expect(fetchRepositoryHistory('repo-1')).rejects.toBeInstanceOf(
      ContractError,
    )
    await vi.advanceTimersByTimeAsync(350)
    await expectation
  })
})
