import { z } from 'zod'

/**
 * Уровни severity порога — ровно `FindingSeverity` модели бэкенда, согласовано в #28:
 * без пресетов и маппинга, merge gate и вердикт «запрос изменений» читают один порог.
 * Уровни повторяют `SEVERITIES` из `entities/review-finding`, но объявлены здесь: слайсы
 * одного слоя не зависят друг от друга.
 */
export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const

export type SeverityLevel = (typeof SEVERITY_LEVELS)[number]

/**
 * Настройки ревью репозитория. По смыслу совпадают с полями бэкенда (`auto_review_enabled`
 * уже приходит в `GET /api/v1/repositories`; `min_severity` — порог из решения #28,
 * дефолт `critical`, пока настроек нет): будущий HTTP-adapter смаппит snake_case в
 * camelCase при парсинге. Содержимое glob-паттернов проверяет бэкенд, UI хранит строки.
 */
export const RepositorySettingsSchema = z.object({
  autoReviewEnabled: z.boolean(),
  branchFilter: z.array(z.string()),
  minSeverity: z.enum(SEVERITY_LEVELS),
})

export type RepositorySettings = z.infer<typeof RepositorySettingsSchema>

/**
 * Правило владельца репозитория из `.review/rules.md` — форма повторяет домен бэкенда
 * (api#49, `RepoRule`): раздел `##` с паттернами области действия и нумерованными
 * проверками. Парсинг markdown остаётся на бэкенде, adapter отдаёт готовые правила.
 */
export const RepoRuleSchema = z.object({
  name: z.string(),
  patterns: z.array(z.string()),
  excludes: z.array(z.string()),
  checks: z.array(z.string()),
})

export type RepoRule = z.infer<typeof RepoRuleSchema>

/** Раздел rules.md, не ставший правилом: имя и чего не хватило (api#49, `RejectedRule`). */
export const RejectedRuleSchema = z.object({
  name: z.string(),
  reason: z.string(),
})

export type RejectedRule = z.infer<typeof RejectedRuleSchema>

/**
 * Чем закончилась загрузка `.review/rules.md` — четыре исхода повторяют `RulesStatus`
 * бэкенда (api#49). Всё, кроме `loaded`, — дефолтный фоллбэк: ревью по стандартным
 * критериям.
 */
export const RULES_LOAD_STATUSES = ['loaded', 'absent', 'too_large', 'unavailable'] as const

export type RulesLoadStatus = (typeof RULES_LOAD_STATUSES)[number]

/**
 * Статус `.review/rules.md` в ветке репозитория; варианты различаются дискриминантом
 * `status`. В `loaded` — принятые и отклонённые правила и время выборки; у остальных
 * исходов файла для показа нет, ветка и путь остаются для бейджа.
 */
const rulesFileRef = {
  branch: z.string(),
  path: z.string(),
}

export const RulesStatusSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('loaded'),
    ...rulesFileRef,
    rules: z.array(RepoRuleSchema),
    rejected: z.array(RejectedRuleSchema),
    fetchedAt: z.string(),
  }),
  z.object({ status: z.literal('absent'), ...rulesFileRef }),
  z.object({ status: z.literal('too_large'), ...rulesFileRef }),
  z.object({ status: z.literal('unavailable'), ...rulesFileRef }),
])

export type RulesStatus = z.infer<typeof RulesStatusSchema>

/**
 * Применимы ли кастомные правила: `loaded` и хотя бы одно правило. Бэкенд (api#49) отдаёт
 * `loaded` и при пустом `rules` — файл пуст или все разделы отклонены, тогда ревью идёт по
 * стандартным критериям, как и у остальных исходов.
 */
export function isRulesApplied(status: RulesStatus): boolean {
  return status.status === 'loaded' && status.rules.length > 0
}

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
