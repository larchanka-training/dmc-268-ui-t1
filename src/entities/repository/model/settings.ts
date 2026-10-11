import { z } from 'zod'

/**
 * Пресеты порога severity из задачи. Маппинг на четыре уровня модели бэкенда не согласован
 * (open question в #28), поэтому UI хранит ровно то, что выбирает пользователь.
 */
export const SEVERITY_THRESHOLDS = ['all', 'warn_and_critical', 'critical_only'] as const

export type SeverityThreshold = (typeof SEVERITY_THRESHOLDS)[number]

/**
 * Настройки ревью репозитория. По смыслу совпадают с полями бэкенда (`auto_review_enabled`
 * уже приходит в `GET /api/v1/repositories`): будущий HTTP-adapter смаппит snake_case в
 * camelCase при парсинге. Содержимое glob-паттернов проверяет бэкенд, UI хранит строки.
 */
export const RepositorySettingsSchema = z.object({
  autoReviewEnabled: z.boolean(),
  branchFilter: z.array(z.string()),
  severityThreshold: z.enum(SEVERITY_THRESHOLDS),
})

export type RepositorySettings = z.infer<typeof RepositorySettingsSchema>

/** Пункт секции правил: обычное правило или директива игнорирования. */
export const RuleEntrySchema = z.object({
  kind: z.enum(['rule', 'ignore']),
  text: z.string(),
})

export type RuleEntry = z.infer<typeof RuleEntrySchema>

export const RuleSectionSchema = z.object({
  title: z.string(),
  entries: z.array(RuleEntrySchema),
})

export type RuleSection = z.infer<typeof RuleSectionSchema>

/**
 * Статус `.review/rules.md` в ветке репозитория. Adapter отдаёт уже распарсенные секции —
 * парсинг markdown во фронтенде не повторяется. Без файла нет ни секций, ни времени выборки:
 * варианты различаются дискриминантом `present`.
 */
export const RulesStatusSchema = z.discriminatedUnion('present', [
  z.object({
    present: z.literal(true),
    branch: z.string(),
    path: z.string(),
    sections: z.array(RuleSectionSchema),
    fetchedAt: z.string(),
  }),
  z.object({
    present: z.literal(false),
    branch: z.string(),
    path: z.string(),
  }),
])

export type RulesStatus = z.infer<typeof RulesStatusSchema>

/**
 * Прогон в истории проверок репозитория; `id` ведёт на существующий экран `/reviews/:reviewId`.
 * Статус — открытая строка, как у `ReviewRun.status`: чужой enum будет расти, незнакомое
 * значение показывается как есть и не роняет блок истории.
 */
export const HistoryRunSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  sourceBranch: z.string(),
  status: z.string(),
  createdAt: z.string(),
})

export type HistoryRun = z.infer<typeof HistoryRunSchema>
