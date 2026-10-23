import { z } from 'zod'

import type { ApiSchemas, MatchesContract } from '@/shared/api/contract'

/**
 * Уровни severity порога — ровно `FindingSeverity` контракта, согласовано в #28:
 * без пресетов и маппинга, merge gate и вердикт «запрос изменений» читают один порог.
 * Уровни повторяют `SEVERITIES` из `entities/review-finding`, но объявлены здесь: слайсы
 * одного слоя не зависят друг от друга.
 */
export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const

export type SeverityLevel = (typeof SEVERITY_LEVELS)[number]

/**
 * Настройки ревью репозитория — `RepositorySettingsResponse` контракта: поля в snake_case,
 * как отвечает бэкенд, отдельного маппинга нет. `auto_review_enabled` — та же колонка
 * репозитория, что в `RepositoryResponse`. Содержимое glob-паттернов проверяет бэкенд,
 * UI хранит строки.
 */
export const RepositorySettingsSchema = z.object({
  auto_review_enabled: z.boolean(),
  branch_filter: z.array(z.string()),
  min_severity: z.enum(SEVERITY_LEVELS),
})

export type RepositorySettings = z.infer<typeof RepositorySettingsSchema>

/** Тело сохранения — тип контракта как есть: полный набор полей, замена целиком. */
export type RepositorySettingsUpdate = ApiSchemas['RepositorySettingsUpdate']

/**
 * Правило владельца репозитория из `.review/rules.md` — `RepoRule` контракта: раздел `##`
 * с паттернами области действия и нумерованными проверками. Парсинг markdown — на бэкенде,
 * ручка отдаёт готовые правила.
 */
export const RepoRuleSchema = z.object({
  name: z.string(),
  patterns: z.array(z.string()),
  excludes: z.array(z.string()),
  checks: z.array(z.string()),
})

export type RepoRule = z.infer<typeof RepoRuleSchema>

/** Раздел rules.md, не ставший правилом: имя и чего не хватило (`RejectedRule` контракта). */
export const RejectedRuleSchema = z.object({
  name: z.string(),
  reason: z.string(),
})

export type RejectedRule = z.infer<typeof RejectedRuleSchema>

/**
 * Чем закончилась загрузка `.review/rules.md` — пять исходов `RulesStatusResponse`
 * контракта. `empty` — файл разобран, но ни один раздел не стал правилом; всё, кроме
 * `loaded`, — дефолтный фоллбэк: ревью по стандартным критериям.
 */
export const RULES_LOAD_STATUSES = [
  'loaded',
  'empty',
  'absent',
  'too_large',
  'unavailable',
] as const

export type RulesLoadStatus = (typeof RULES_LOAD_STATUSES)[number]

/**
 * Статус `.review/rules.md` в ветке репозитория; варианты различаются дискриминантом
 * `status`. В `loaded` и `empty` — отклонённые разделы и время выборки; у остальных
 * исходов файла для показа нет, ветка и путь остаются для бейджа.
 */
const rulesFileRef = {
  branch: z.string(),
  path: z.string(),
}

const rulesParsedRef = {
  ...rulesFileRef,
  rejected: z.array(RejectedRuleSchema),
  fetched_at: z.string(),
}

export const RulesStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('loaded'), ...rulesParsedRef, rules: z.array(RepoRuleSchema) }),
  z.object({ status: z.literal('empty'), ...rulesParsedRef }),
  z.object({ status: z.literal('absent'), ...rulesFileRef }),
  z.object({ status: z.literal('too_large'), ...rulesFileRef }),
  z.object({ status: z.literal('unavailable'), ...rulesFileRef }),
])

export type RulesStatus = z.infer<typeof RulesStatusSchema>

// Разбор ответов совпадает с контрактом поле в поле; разойдутся — упадёт typecheck.
const contractCheck: [
  MatchesContract<SeverityLevel, ApiSchemas['FindingSeverity']>,
  MatchesContract<RepositorySettings, ApiSchemas['RepositorySettingsResponse']>,
  MatchesContract<RulesStatus, ApiSchemas['RulesStatusResponse']>,
] = [true, true, true]
void contractCheck
