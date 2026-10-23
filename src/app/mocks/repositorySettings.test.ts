import { describe, expect, it, vi } from 'vitest'

import {
  type Repository,
  RepositorySettingsSchema,
  type RepositorySettingsUpdate,
  RulesStatusSchema,
} from '../../entities/repository'
import { ApiError } from '../../shared/api'
import { mockRepositoryId } from './repositories'
import { createRepositorySettingsStore } from './repositorySettings'

function repository(n: number, defaultBranch = 'main'): Repository {
  return {
    // Id как в mock adapter: фикстуры store ключуются по `mockRepositoryId(n)`.
    id: mockRepositoryId(n),
    provider: 'github',
    provider_id: String(100 + n),
    full_name: `larchanka-training/repo-${n}`,
    default_branch: defaultBranch,
    auto_review_enabled: true,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  }
}

/** Свой набор репозиториев на каждый тест: состояние store не протекает между тестами. */
function createStore(...repos: Repository[]): ReturnType<typeof createRepositorySettingsStore> {
  return createRepositorySettingsStore({
    findRepository: (repositoryId) => repos.find((repo) => repo.id === repositoryId),
  })
}

describe('фикстуры настроек', () => {
  it('у первого и второго репозитория настройки различаются и проходят схему', () => {
    const store = createStore(repository(1), repository(2))
    const first = store.settings(mockRepositoryId(1))
    const second = store.settings(mockRepositoryId(2))

    expect(first).not.toEqual(second)
    expect(RepositorySettingsSchema.safeParse(first).success).toBe(true)
    expect(RepositorySettingsSchema.safeParse(second).success).toBe(true)
  })

  it('возвращённые настройки — копия: мутация не меняет store', () => {
    const store = createStore(repository(1))
    const settings = store.settings(mockRepositoryId(1))
    settings.branch_filter.push('hack/**')

    expect(store.settings(mockRepositoryId(1)).branch_filter).not.toContain('hack/**')
  })
})

describe('статус правил', () => {
  it('первый репозиторий: файл загружен, три правила и отклонённый раздел', () => {
    const store = createStore(repository(1), repository(2), repository(3))
    const status = store.rulesStatus(mockRepositoryId(1))

    expect(RulesStatusSchema.safeParse(status).success).toBe(true)
    if (status.status === 'loaded') {
      expect(status.rules.map((r) => r.name)).toEqual(['Security', 'Performance', 'Style'])
      expect(status.rules.every((r) => r.patterns.length > 0 && r.checks.length > 0)).toBe(true)
      expect(status.rejected).toHaveLength(1)
      expect(status.fetched_at).toBe('2026-10-11T09:40:00.000Z')
    }
  })

  it('второй репозиторий: файла правил нет', () => {
    const store = createStore(repository(2))
    const status = store.rulesStatus(mockRepositoryId(2))

    expect(RulesStatusSchema.safeParse(status).success).toBe(true)
    expect(status.status).toBe('absent')
  })

  it('третий репозиторий: исход empty — файл разобран, но применимых правил нет', () => {
    const store = createStore(repository(3))
    const status = store.rulesStatus(mockRepositoryId(3))

    expect(RulesStatusSchema.safeParse(status).success).toBe(true)
    expect(status.status).toBe('empty')
    if (status.status === 'empty') {
      expect(status.rejected.map((rule) => rule.name)).toEqual(['Docs', 'A11y'])
    }
  })
})

describe('saveSettings', () => {
  it('сохранение меняет состояние store', () => {
    const store = createStore(repository(1), repository(2))
    const draft: RepositorySettingsUpdate = {
      auto_review_enabled: false,
      branch_filter: ['release/**'],
      min_severity: 'critical',
    }

    expect(store.saveSettings(mockRepositoryId(1), draft)).toEqual(draft)
    expect(store.settings(mockRepositoryId(1))).toEqual(draft)
  })

  it('сохранение дергает onAutoReviewChange с новым значением флага, как бэкенд — колонку репозитория', () => {
    const onAutoReviewChange = vi.fn()
    const store = createRepositorySettingsStore({
      findRepository: (repositoryId) => [repository(1)].find((repo) => repo.id === repositoryId),
      onAutoReviewChange,
    })

    store.saveSettings(mockRepositoryId(1), {
      auto_review_enabled: false,
      branch_filter: [],
      min_severity: 'low',
    })

    expect(onAutoReviewChange).toHaveBeenCalledWith(mockRepositoryId(1), false)
  })

  it('сохранение затрагивает только свой репозиторий', () => {
    const store = createStore(repository(1), repository(2))
    const before = store.settings(mockRepositoryId(2))

    store.saveSettings(mockRepositoryId(1), {
      auto_review_enabled: false,
      branch_filter: [],
      min_severity: 'low',
    })

    expect(store.settings(mockRepositoryId(2))).toEqual(before)
  })

  it('несуществующему репозиторию сохранить нельзя', () => {
    const store = createStore(repository(1))

    expect(() => store.saveSettings('repo-nope', store.settings(mockRepositoryId(1)))).toThrow(
      ApiError,
    )
  })
})

describe('незнакомый идентификатор репозитория', () => {
  it.each([
    ['settings', (store: ReturnType<typeof createStore>) => store.settings('repo-nope')],
    ['rulesStatus', (store: ReturnType<typeof createStore>) => store.rulesStatus('repo-nope')],
    [
      'saveSettings',
      (store: ReturnType<typeof createStore>) =>
        store.saveSettings('repo-nope', {
          auto_review_enabled: true,
          branch_filter: [],
          min_severity: 'low',
        }),
    ],
  ])('%s бросает ошибку, а не отдаёт пустые данные', (_, read) => {
    expect(() => read(createStore())).toThrow(ApiError)
  })
})

describe('репозиторий, подключённый после старта сессии', () => {
  it('получает дефолтные настройки и статус без правил', () => {
    const store = createStore(repository(1), repository(4, 'develop'))

    expect(store.settings(mockRepositoryId(4))).toEqual({
      auto_review_enabled: true,
      branch_filter: [],
      min_severity: 'critical',
    })
    expect(store.rulesStatus(mockRepositoryId(4))).toEqual({
      status: 'absent',
      branch: 'develop',
      path: '.review/rules.md',
    })
  })
})
