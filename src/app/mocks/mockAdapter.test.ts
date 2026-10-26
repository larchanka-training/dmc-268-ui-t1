import { describe, expect, it } from 'vitest'

import {
  fetchRepository,
  fetchRepositorySettings,
  fetchRulesStatus,
  saveRepositorySettings,
} from '../../entities/repository'
import { createMockAdapter } from './mockAdapter'
import { mockRepositoryId } from './repositories'

/**
 * Mock adapter проверяется через публичные fetch-функции слайса: они же валидируют ответы
 * схемами контракта, поэтому тест проверяет и маршруты, и форму данных.
 */

/** Adapter без задержек: маршруты и формы ответов проверяются без ожидания. */
function adapter() {
  return createMockAdapter({ latencyMs: 0 })
}

/** Чужой для установки id: формат тот же (uuid), репозитория такого нет. */
const FOREIGN_ID = '00000000-0000-4000-8000-00000000dead'

describe('mock adapter: блок настроек репозитория', () => {
  it('GET /repositories/{id} отдаёт репозиторий формой контракта', async () => {
    const repo = await fetchRepository(adapter(), mockRepositoryId(1))

    expect(repo.full_name).toBe('larchanka-training/platform-api')
    expect(repo.auto_review_enabled).toBe(true)
  })

  it('GET …/settings и GET …/rules отдают формы контракта', async () => {
    const transport = adapter()
    const id = mockRepositoryId(1)

    const settings = await fetchRepositorySettings(transport, id)
    expect(settings.min_severity).toBe('high')

    const rules = await fetchRulesStatus(transport, id)
    expect(rules.status).toBe('loaded')
  })

  it('чужой id: GET /repositories/{id} — 404 REPOSITORY_NOT_FOUND, а не пустые данные', async () => {
    await expect(fetchRepository(adapter(), FOREIGN_ID)).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'REPOSITORY_NOT_FOUND',
    })
  })
})

describe('mock adapter: сохранение настроек', () => {
  it('PUT …/settings: следующий GET отдаёт новое, флаг авто-ревью синхронизируется с репозиторием', async () => {
    const transport = adapter()
    const id = mockRepositoryId(1)
    const draft = {
      auto_review_enabled: false,
      branch_filter: ['release/**'],
      min_severity: 'low' as const,
    }

    expect(await saveRepositorySettings(transport, id, draft)).toEqual(draft)

    expect(await fetchRepositorySettings(transport, id)).toEqual(draft)

    // Флаг авто-ревью — та же колонка репозитория: сохранение меняет и `GET /repositories/{id}`.
    const repo = await fetchRepository(transport, id)
    expect(repo.auto_review_enabled).toBe(false)
  })
})
