import { describe, expect, it } from 'vitest'

import {
  HistoryRunSchema,
  type Repository,
  RepositorySettingsSchema,
  type RepositorySettings,
  RulesStatusSchema,
} from '../../entities/repository'
import { ApiError } from '../../shared/api'
import { createRepositorySettingsStore } from './repositorySettings'

/**
 * Зеркалит `ReviewRunStatus` бэкенда. Прямого импорта из `entities/review-run` нет:
 * слайсы одного слоя не зависят друг от друга.
 */
const ALL_RUN_STATUSES = [
  'queued',
  'building_context',
  'analysing',
  'publishing',
  'completed',
  'failed',
  'cancelled',
] as const

function repository(n: number, defaultBranch = 'main'): Repository {
  return {
    id: `repo-${n}`,
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
function createStore(...repos: Repository[]) {
  return createRepositorySettingsStore({
    findRepository: (repositoryId) => repos.find((repo) => repo.id === repositoryId),
  })
}

describe('фикстуры настроек', () => {
  it('у repo-1 и repo-2 настройки различаются и проходят схему', () => {
    const store = createStore(repository(1), repository(2))
    const first = store.settings('repo-1')
    const second = store.settings('repo-2')

    expect(first).not.toEqual(second)
    expect(RepositorySettingsSchema.safeParse(first).success).toBe(true)
    expect(RepositorySettingsSchema.safeParse(second).success).toBe(true)
  })

  it('возвращённые настройки — копия: мутация не меняет store', () => {
    const store = createStore(repository(1))
    const settings = store.settings('repo-1')
    settings.branchFilter.push('hack/**')

    expect(store.settings('repo-1').branchFilter).not.toContain('hack/**')
  })
})

describe('статус правил', () => {
  it('repo-1: файл загружен, три правила в форме api#49 и отклонённый раздел', () => {
    const store = createStore(repository(1), repository(2), repository(3))
    const status = store.rulesStatus('repo-1')

    expect(RulesStatusSchema.safeParse(status).success).toBe(true)
    if (status.status === 'loaded') {
      expect(status.rules.map((r) => r.name)).toEqual(['Security', 'Performance', 'Style'])
      expect(status.rules.every((r) => r.patterns.length > 0 && r.checks.length > 0)).toBe(true)
      expect(status.rejected).toHaveLength(1)
    }
  })

  it('repo-2: файла правил нет', () => {
    const store = createStore(repository(2))
    const status = store.rulesStatus('repo-2')

    expect(RulesStatusSchema.safeParse(status).success).toBe(true)
    expect(status.status).toBe('absent')
  })

  it('repo-3: файл загружен, но применимых правил нет — оба раздела отклонены', () => {
    const store = createStore(repository(3))
    const status = store.rulesStatus('repo-3')

    expect(RulesStatusSchema.safeParse(status).success).toBe(true)
    if (status.status === 'loaded') {
      expect(status.rules).toEqual([])
      expect(status.rejected.map((rule) => rule.name)).toEqual(['Docs', 'A11y'])
    }
  })
})

describe('история проверок', () => {
  it('repo-1: покрывает все статусы, новые прогоны сверху', () => {
    const store = createStore(repository(1))
    const history = store.history('repo-1')

    expect(history.map((run) => run.status).sort()).toEqual([...ALL_RUN_STATUSES].sort())
    for (const run of history) {
      expect(HistoryRunSchema.safeParse(run).success).toBe(true)
    }
    const createdAt = history.map((run) => run.createdAt)
    expect([...createdAt].sort((a, b) => b.localeCompare(a))).toEqual(createdAt)
  })

  it('repo-2: проверок ещё не было', () => {
    const store = createStore(repository(2))
    expect(store.history('repo-2')).toEqual([])
  })
})

describe('saveSettings', () => {
  it('сохранение меняет состояние store', () => {
    const store = createStore(repository(1), repository(2))
    const draft: RepositorySettings = {
      autoReviewEnabled: false,
      branchFilter: ['release/**'],
      minSeverity: 'critical',
    }

    expect(store.saveSettings('repo-1', draft)).toEqual(draft)
    expect(store.settings('repo-1')).toEqual(draft)
  })

  it('сохранение затрагивает только свой репозиторий', () => {
    const store = createStore(repository(1), repository(2))
    const before = store.settings('repo-2')

    store.saveSettings('repo-1', { autoReviewEnabled: false, branchFilter: [], minSeverity: 'low' })

    expect(store.settings('repo-2')).toEqual(before)
  })

  it('несуществующему репозиторию сохранить нельзя', () => {
    const store = createStore(repository(1))

    expect(() => store.saveSettings('repo-nope', store.settings('repo-1'))).toThrow(ApiError)
  })
})

describe('незнакомый идентификатор репозитория', () => {
  it.each([
    ['settings', (store: ReturnType<typeof createStore>) => store.settings('repo-nope')],
    ['rulesStatus', (store: ReturnType<typeof createStore>) => store.rulesStatus('repo-nope')],
    ['history', (store: ReturnType<typeof createStore>) => store.history('repo-nope')],
  ])('%s бросает ошибку, а не отдаёт пустые данные', (_, read) => {
    expect(() => read(createStore())).toThrow(ApiError)
  })
})

describe('репозиторий, подключённый после старта сессии', () => {
  it('получает дефолтные настройки, статус без правил и пустую историю', () => {
    const store = createStore(repository(1), repository(4, 'develop'))

    expect(store.settings('repo-4')).toEqual({
      autoReviewEnabled: true,
      branchFilter: [],
      minSeverity: 'critical',
    })
    expect(store.rulesStatus('repo-4')).toEqual({
      status: 'absent',
      branch: 'develop',
      path: '.review/rules.md',
    })
    expect(store.history('repo-4')).toEqual([])
  })
})
