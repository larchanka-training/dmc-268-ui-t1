import { describe, expect, it } from 'vitest'

import {
  HistoryRunSchema,
  RepositorySettingsSchema,
  RuleSectionSchema,
  RulesStatusSchema,
  SEVERITY_THRESHOLDS,
  type HistoryRun,
  type RepositorySettings,
  type RuleSection,
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

function makeSection(overrides: Partial<RuleSection> = {}): RuleSection {
  return {
    title: 'Security',
    entries: [
      { kind: 'rule', text: 'Не хранить секреты в коде' },
      { kind: 'ignore', text: 'vendor/**' },
    ],
    ...overrides,
  }
}

function makeRulesPresent(overrides: Partial<Extract<RulesStatus, { present: true }>> = {}) {
  return {
    present: true as const,
    branch: 'main',
    path: '.review/rules.md',
    sections: [makeSection()],
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

describe('RuleSectionSchema', () => {
  it('принимает секцию с правилами и директивой игнорирования', () => {
    expect(RuleSectionSchema.safeParse(makeSection()).success).toBe(true)
  })

  it('отвергает пункт с неизвестным видом', () => {
    const dto: unknown = { title: 'Style', entries: [{ kind: 'note', text: '...' }] }
    expect(RuleSectionSchema.safeParse(dto).success).toBe(false)
  })
})

describe('RulesStatusSchema', () => {
  it('принимает статус с распарсенными секциями, когда файл есть', () => {
    expect(RulesStatusSchema.safeParse(makeRulesPresent()).success).toBe(true)
  })

  it('принимает вариант без файла правил', () => {
    const dto = { present: false, branch: 'main', path: '.review/rules.md' }
    const result = RulesStatusSchema.safeParse(dto)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(dto)
    }
  })

  it('требует секции и время выборки, когда файл есть', () => {
    const dto: unknown = { present: true, branch: 'main', path: '.review/rules.md' }
    expect(RulesStatusSchema.safeParse(dto).success).toBe(false)
  })

  it('отвергает объект без дискриминанта present', () => {
    const dto: unknown = { branch: 'main', path: '.review/rules.md' }
    expect(RulesStatusSchema.safeParse(dto).success).toBe(false)
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
