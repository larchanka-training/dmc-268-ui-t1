import { describe, expect, it } from 'vitest'

import {
  RejectedRuleSchema,
  RepoRuleSchema,
  RepositorySettingsSchema,
  RULES_LOAD_STATUSES,
  RulesStatusSchema,
  SEVERITY_LEVELS,
  type RepositorySettings,
  type RepoRule,
  type RulesStatus,
} from './settings'

function makeSettings(overrides: Partial<RepositorySettings> = {}): RepositorySettings {
  return {
    auto_review_enabled: true,
    branch_filter: ['feature/**', 'fix/**'],
    min_severity: 'low',
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
    fetched_at: '2026-10-11T10:00:00.000Z',
    ...overrides,
  }
}

function makeRulesEmpty(overrides: Partial<Extract<RulesStatus, { status: 'empty' }>> = {}) {
  return {
    status: 'empty' as const,
    branch: 'main',
    path: '.review/rules.md',
    rejected: [{ name: 'Docs', reason: 'нет паттерна (pattern); нет проверок' }],
    fetched_at: '2026-10-11T10:00:00.000Z',
    ...overrides,
  }
}

describe('RepositorySettingsSchema', () => {
  it.each(SEVERITY_LEVELS)('принимает уровень severity %s', (level) => {
    expect(RepositorySettingsSchema.safeParse(makeSettings({ min_severity: level })).success).toBe(
      true,
    )
  })

  it('отвергает значение вне уровней severity', () => {
    const dto: unknown = makeSettings({
      min_severity: 'warn' as RepositorySettings['min_severity'],
    })
    expect(RepositorySettingsSchema.safeParse(dto).success).toBe(false)
  })

  it('отвергает настройки без обязательного поля', () => {
    const dto: Partial<RepositorySettings> = makeSettings()
    delete dto.branch_filter
    expect(RepositorySettingsSchema.safeParse(dto).success).toBe(false)
  })

  it('отвергает поле не того типа', () => {
    const dto: unknown = { ...makeSettings(), auto_review_enabled: 'yes' }
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
      expect(result.data.fetched_at).toBe(dto.fetched_at)
    }
  })

  it('принимает исход empty: файл разобран, но ни один раздел не стал правилом', () => {
    const dto = makeRulesEmpty()

    const result = RulesStatusSchema.safeParse(dto)
    expect(result.success).toBe(true)
    if (result.success && result.data.status === 'empty') {
      expect(result.data).toEqual(dto)
      // У исхода нет поля rules: применимых правил не существует, а не «пустой список».
      expect('rules' in result.data).toBe(false)
    }
  })

  it('требует отклонённые разделы и время выборки, когда исход empty', () => {
    const dto: unknown = { status: 'empty', branch: 'main', path: '.review/rules.md' }
    expect(RulesStatusSchema.safeParse(dto).success).toBe(false)
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

  it('набор исходов повторяет RulesStatusResponse контракта (api#113)', () => {
    expect(RULES_LOAD_STATUSES).toEqual(['loaded', 'empty', 'absent', 'too_large', 'unavailable'])
  })
})
