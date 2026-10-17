import { describe, expect, it } from 'vitest'

import {
  HistoryRunSchema,
  RejectedRuleSchema,
  RepoRuleSchema,
  RepositorySettingsSchema,
  RULES_LOAD_STATUSES,
  RulesStatusSchema,
  SEVERITY_THRESHOLDS,
  isRulesApplied,
  type HistoryRun,
  type RepositorySettings,
  type RepoRule,
  type RulesStatus,
} from './settings'

function makeSettings(overrides: Partial<RepositorySettings> = {}): RepositorySettings {
  return {
    autoReviewEnabled: true,
    branchFilter: ['feature/**', 'fix/**'],
    severityThreshold: 'all',
    ...overrides,
  }
}

function makeRule(overrides: Partial<RepoRule> = {}): RepoRule {
  return {
    name: 'Security',
    patterns: ['app/**/*.py'],
    excludes: ['**/tests/**'],
    checks: ['Не хранить секреты в коде'],
    ...overrides,
  }
}

function makeRulesLoaded(overrides: Partial<Extract<RulesStatus, { status: 'loaded' }>> = {}) {
  return {
    status: 'loaded' as const,
    branch: 'main',
    path: '.review/rules.md',
    rules: [makeRule()],
    rejected: [],
    fetchedAt: '2026-10-11T10:00:00.000Z',
    ...overrides,
  }
}

function makeHistoryRun(overrides: Partial<HistoryRun> = {}): HistoryRun {
  return {
    id: 'run-1',
    number: 42,
    title: 'Чтение токена из окружения',
    sourceBranch: 'feat/env-token',
    status: 'completed',
    createdAt: '2026-10-05T17:03:26Z',
    ...overrides,
  }
}

describe('RepositorySettingsSchema', () => {
  it.each(SEVERITY_THRESHOLDS)('принимает пресет severity %s', (threshold) => {
    expect(
      RepositorySettingsSchema.safeParse(makeSettings({ severityThreshold: threshold })).success,
    ).toBe(true)
  })

  it('отвергает значение вне пресетов severity', () => {
    const dto: unknown = makeSettings({
      severityThreshold: 'warn' as RepositorySettings['severityThreshold'],
    })
    expect(RepositorySettingsSchema.safeParse(dto).success).toBe(false)
  })

  it('отвергает настройки без обязательного поля', () => {
    const dto: Partial<RepositorySettings> = makeSettings()
    delete dto.branchFilter
    expect(RepositorySettingsSchema.safeParse(dto).success).toBe(false)
  })

  it('отвергает поле не того типа', () => {
    const dto: unknown = { ...makeSettings(), autoReviewEnabled: 'yes' }
    expect(RepositorySettingsSchema.safeParse(dto).success).toBe(false)
  })
})

describe('RepoRuleSchema', () => {
  it('принимает правило с именем, областью действия и проверками', () => {
    expect(RepoRuleSchema.safeParse(makeRule()).success).toBe(true)
  })

  it('отвергает правило без паттернов области действия', () => {
    const dto: Partial<RepoRule> = makeRule()
    delete dto.patterns
    expect(RepoRuleSchema.safeParse(dto).success).toBe(false)
  })

  it('допускает пустые части: неполное правило приезжает как rejected, а не мимо схемы', () => {
    const dto: unknown = { ...makeRule(), checks: [] }
    expect(RepoRuleSchema.safeParse(dto).success).toBe(true)
  })
})

describe('RejectedRuleSchema', () => {
  it('принимает раздел с именем и причиной отклонения', () => {
    expect(
      RejectedRuleSchema.safeParse({ name: 'Docs', reason: 'нет паттерна (pattern)' }).success,
    ).toBe(true)
  })

  it('отвергает раздел без причины', () => {
    const dto: unknown = { name: 'Docs' }
    expect(RejectedRuleSchema.safeParse(dto).success).toBe(false)
  })
})

describe('RulesStatusSchema', () => {
  it('принимает статус с принятыми и отклонёнными правилами, когда файл есть', () => {
    const dto = makeRulesLoaded({
      rejected: [{ name: 'Docs', reason: 'нет паттерна (pattern); нет проверок' }],
    })

    const result = RulesStatusSchema.safeParse(dto)
    expect(result.success).toBe(true)
    if (result.success && result.data.status === 'loaded') {
      expect(result.data.rules).toHaveLength(1)
      expect(result.data.rejected[0]).toMatchObject({ name: 'Docs' })
    }
  })

  it.each(['absent', 'too_large', 'unavailable'] as const)(
    'принимает исход без файла правил: %s',
    (status) => {
      const dto = { status, branch: 'main', path: '.review/rules.md' }

      const result = RulesStatusSchema.safeParse(dto)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(dto)
      }
    },
  )

  it('требует правила и время выборки, когда файл загружен', () => {
    const dto: unknown = { status: 'loaded', branch: 'main', path: '.review/rules.md' }
    expect(RulesStatusSchema.safeParse(dto).success).toBe(false)
  })

  it('отвергает незнакомый исход загрузки', () => {
    const dto: unknown = { status: 'half', branch: 'main', path: '.review/rules.md' }
    expect(RulesStatusSchema.safeParse(dto).success).toBe(false)
  })

  it('отвергает объект без дискриминанта status', () => {
    const dto: unknown = { branch: 'main', path: '.review/rules.md' }
    expect(RulesStatusSchema.safeParse(dto).success).toBe(false)
  })

  it('набор исходов повторяет RulesStatus бэкенда (api#49)', () => {
    expect(RULES_LOAD_STATUSES).toEqual(['loaded', 'absent', 'too_large', 'unavailable'])
  })
})

describe('isRulesApplied', () => {
  it('применимы: loaded с хотя бы одним правилом', () => {
    expect(isRulesApplied(makeRulesLoaded())).toBe(true)
  })

  it('не применимы: loaded без правил — файл пуст или все разделы отклонены', () => {
    expect(isRulesApplied(makeRulesLoaded({ rules: [] }))).toBe(false)
  })

  it.each(['absent', 'too_large', 'unavailable'] as const)('не применимы: исход %s', (status) => {
    expect(isRulesApplied({ status, branch: 'main', path: '.review/rules.md' })).toBe(false)
  })
})

describe('HistoryRunSchema', () => {
  it('принимает незнакомый статус прогона, а не роняет блок истории', () => {
    expect(
      HistoryRunSchema.safeParse(makeHistoryRun({ status: 'waiting_for_quota' })).success,
    ).toBe(true)
  })

  it('отвергает прогон без обязательного поля', () => {
    const dto: Partial<HistoryRun> = makeHistoryRun()
    delete dto.title
    expect(HistoryRunSchema.safeParse(dto).success).toBe(false)
  })

  it('отвергает нецелый номер прогона', () => {
    expect(HistoryRunSchema.safeParse(makeHistoryRun({ number: 42.5 })).success).toBe(false)
  })
})
