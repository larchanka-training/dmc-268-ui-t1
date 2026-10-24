import { describe, expect, it } from 'vitest'

import {
  fetchRepository,
  fetchRepositorySettings,
  fetchRulesStatus,
  saveRepositorySettings,
} from '../../entities/repository'
import { fetchReviewRunList } from '../../entities/review-run'
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

describe('mock adapter: история репозитория', () => {
  it('GET /reviews?repository_id= фильтрует список по репозиторию', async () => {
    const transport = adapter()
    const first = mockRepositoryId(1)
    const second = mockRepositoryId(2)

    const all = await fetchReviewRunList(transport, {})
    const ofFirst = await fetchReviewRunList(transport, { repository_id: [first] })
    const ofSecond = await fetchReviewRunList(transport, { repository_id: [second] })

    // Фикстуры делят прогоны между двумя репозиториями: фильтр не теряет и не дублирует.
    expect(ofFirst.total + ofSecond.total).toBe(all.total)
    expect(ofFirst.items).not.toEqual(ofSecond.items)
    expect(ofFirst.items.every((run) => run.merge_request.repository.id === first)).toBe(true)
    expect(ofSecond.items.every((run) => run.merge_request.repository.id === second)).toBe(true)
    // Прогон фикстуры (run-42) принадлежит первому репозиторию и остаётся в его списке.
    expect(ofFirst.items.some((run) => run.id === 'run-42')).toBe(true)
  })
})
