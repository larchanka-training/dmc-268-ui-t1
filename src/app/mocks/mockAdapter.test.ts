import { describe, expect, it } from 'vitest'

import {
  connectRepository,
  disconnectRepository,
  fetchRepositories,
  fetchRepository,
  fetchRepositorySettings,
  fetchRulesStatus,
  saveRepositorySettings,
} from '../../entities/repository'
import { createMockAdapter } from './mockAdapter'
import { MOCK_INSTALL_URL, mockRepositoryId } from './repositories'

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

describe('mock adapter: список и переключатель «Ревью»', () => {
  const byName = async (transport: ReturnType<typeof adapter>, name: string) =>
    (await fetchRepositories(transport)).items.find((repo) => repo.full_name === name)

  it('GET /repositories — строки всех видов и install_url, формой контракта', async () => {
    const { items, install_url } = await fetchRepositories(adapter())

    expect(install_url).toBe(MOCK_INSTALL_URL)
    expect(items.map((repo) => repo.full_name)).toEqual([...items.map((r) => r.full_name)].sort())
    expect(items.find((r) => r.full_name === 'larchanka-training/platform-api')).toMatchObject({
      connected: true,
      id: mockRepositoryId(1),
      can_connect: true,
    })
    expect(items.find((r) => r.full_name === 'larchanka-training/mobile-app')).toMatchObject({
      connected: false,
      id: null,
      connected_at: null,
    })
    expect(items.find((r) => r.full_name === 'larchanka-training/infra')).toMatchObject({
      connected: false,
      can_connect: false,
    })
    // Выключенный: запись и id остаются.
    expect(items.find((r) => r.full_name === 'larchanka-training/legacy-web')).toMatchObject({
      connected: false,
      id: mockRepositoryId(4),
    })
  })

  it('POST включает, повтор — 409, DELETE выключает с прежним id, повторный DELETE — тоже успех', async () => {
    const transport = adapter()
    const request = { provider: 'github' as const, provider_id: '103' }

    const created = await connectRepository(transport, request)
    expect(await byName(transport, 'larchanka-training/mobile-app')).toMatchObject({
      connected: true,
      id: created.id,
    })
    await expect(connectRepository(transport, request)).rejects.toMatchObject({
      status: 409,
      code: 'REPOSITORY_ALREADY_CONNECTED',
    })

    await disconnectRepository(transport, created.id)
    await disconnectRepository(transport, created.id)
    expect(await byName(transport, 'larchanka-training/mobile-app')).toMatchObject({
      connected: false,
      id: created.id,
    })

    // Повторное включение возвращает прежнюю запись.
    expect((await connectRepository(transport, request)).id).toBe(created.id)
  })

  it('без прав: POST — 403 REPOSITORY_MANAGE_REQUIRED', async () => {
    await expect(
      connectRepository(adapter(), { provider: 'github', provider_id: '104' }),
    ).rejects.toMatchObject({ status: 403, code: 'REPOSITORY_MANAGE_REQUIRED' })
  })
})
