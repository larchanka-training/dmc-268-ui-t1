import { describe, expect, it } from 'vitest'

import {
  connectRepository,
  getRepositoryHistory,
  getRepositorySettings,
  getRulesStatus,
  saveRepositorySettings,
} from './mockStore'
import {
  HistoryRunSchema,
  RepositorySettingsSchema,
  RulesStatusSchema,
  type RepositorySettings,
} from '../model/settings'

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

describe('фикстуры настроек', () => {
  it('у repo-1 и repo-2 настройки различаются и проходят схему', () => {
    const first = getRepositorySettings('repo-1')
    const second = getRepositorySettings('repo-2')

    expect(first).not.toEqual(second)
    expect(RepositorySettingsSchema.safeParse(first).success).toBe(true)
    expect(RepositorySettingsSchema.safeParse(second).success).toBe(true)
  })

  it('возвращённые настройки — копия: мутация не меняет store', () => {
    const settings = getRepositorySettings('repo-1')
    settings.branchFilter.push('hack/**')

    expect(getRepositorySettings('repo-1').branchFilter).not.toContain('hack/**')
  })
})

describe('статус правил', () => {
  it('repo-1: файл загружен, три правила в форме api#49 и отклонённый раздел', () => {
    const status = getRulesStatus('repo-1')

    expect(RulesStatusSchema.safeParse(status).success).toBe(true)
    expect(status.status).toBe('loaded')
    if (status.status === 'loaded') {
      expect(status.rules.map((r) => r.name)).toEqual(['Security', 'Performance', 'Style'])
      expect(status.rules.every((r) => r.patterns.length > 0 && r.checks.length > 0)).toBe(true)
      expect(status.rejected).toHaveLength(1)
    }
  })

  it('repo-2: файла правил нет', () => {
    const status = getRulesStatus('repo-2')

    expect(RulesStatusSchema.safeParse(status).success).toBe(true)
    expect(status.status).toBe('absent')
  })
})

describe('история проверок', () => {
  it('repo-1: покрывает все статусы, новые прогоны сверху', () => {
    const history = getRepositoryHistory('repo-1')

    expect(history.map((run) => run.status).sort()).toEqual([...ALL_RUN_STATUSES].sort())
    for (const run of history) {
      expect(HistoryRunSchema.safeParse(run).success).toBe(true)
    }
    const createdAt = history.map((run) => run.createdAt)
    expect([...createdAt].sort((a, b) => b.localeCompare(a))).toEqual(createdAt)
  })

  it('repo-2: проверок ещё не было', () => {
    expect(getRepositoryHistory('repo-2')).toEqual([])
  })
})

describe('saveRepositorySettings', () => {
  it('сохранение меняет состояние store', () => {
    const draft: RepositorySettings = {
      autoReviewEnabled: false,
      branchFilter: ['release/**'],
      severityThreshold: 'critical_only',
    }

    const saved = saveRepositorySettings('repo-1', draft)

    expect(saved).toEqual(draft)
    expect(getRepositorySettings('repo-1')).toEqual(draft)
  })

  it('сохранение затрагивает только свой репозиторий', () => {
    const before = getRepositorySettings('repo-2')

    saveRepositorySettings('repo-1', {
      autoReviewEnabled: false,
      branchFilter: [],
      severityThreshold: 'all',
    })

    expect(getRepositorySettings('repo-2')).toEqual(before)
  })

  it('несуществующему репозиторию сохранить нельзя', () => {
    expect(() => saveRepositorySettings('repo-nope', getRepositorySettings('repo-1'))).toThrow(
      'Репозиторий не найден',
    )
  })
})

describe('незнакомый идентификатор репозитория', () => {
  it.each([getRepositorySettings, getRulesStatus, getRepositoryHistory])(
    '%s бросает ошибку, а не отдаёт пустые данные',
    (getter) => {
      expect(() => getter('repo-nope')).toThrow('Репозиторий не найден')
    },
  )
})

describe('репозиторий, подключённый после старта сессии', () => {
  it('получает дефолтные настройки, статус без правил и пустую историю', () => {
    const connected = connectRepository('avail-4')

    expect(getRepositorySettings(connected.id)).toEqual({
      autoReviewEnabled: true,
      branchFilter: [],
      severityThreshold: 'all',
    })
    expect(getRulesStatus(connected.id)).toEqual({
      status: 'absent',
      branch: connected.defaultBranch,
      path: '.review/rules.md',
    })
    expect(getRepositoryHistory(connected.id)).toEqual([])
  })
})
