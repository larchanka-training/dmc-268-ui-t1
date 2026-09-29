import { z } from 'zod'

/** Статусы из `ReviewRunStatus` бэкенда (`app/domain/enums.py`). */
export const KNOWN_STATUSES = [
  'queued',
  'building_context',
  'analysing',
  'publishing',
  'completed',
  'failed',
  'cancelled',
] as const

export type KnownRunStatus = (typeof KNOWN_STATUSES)[number]

const TERMINAL_STATUSES: ReadonlySet<string> = new Set<KnownRunStatus>([
  'completed',
  'failed',
  'cancelled',
])

export const ChangeRequestLinkSchema = z.object({
  // Продукт не привязан к конкретному провайдеру: адрес собирает бэкенд, UI его не разбирает.
  provider: z.string(),
  url: z.string(),
})

/**
 * Расширение §8.2 ради ТЗ шапки: запрос на изменения, который проверял прогон. Поля есть в
 * доменной `MergeRequest` бэкенда, в модели `ReviewRun` архитектуры — нет.
 */
export const MergeRequestSummarySchema = z.object({
  title: z.string(),
  author: z.string(),
  source_branch: z.string(),
  target_branch: z.string(),
})

/** Расширение §8.2 ради ТЗ: итог ревью. `null`, пока прогон не завершён. */
export const VERDICTS = ['approve', 'comment', 'request_changes'] as const

/** Поля и статусы — как в merged backend PR #5 (FRONTEND_ARCHITECTURE.md §8.2). */
export const ReviewRunSchema = z.object({
  id: z.string(),
  head_sha: z.string(),
  base_sha: z.string().nullable(),
  // Чужой enum будет расти: незнакомый статус не должен ронять страницу,
  // поэтому схема принимает любую строку, а UI считает его нетерминальным.
  status: z.string(),
  trigger: z.enum(['webhook', 'manual', 'mention']),
  created_at: z.string(),
  updated_at: z.string(),
  last_progress_at: z.string(),
  failure_reason: z.string().nullable(),
  model: z.string().nullable(),
  tokens_used: z.number().int().nullable(),
  duration_seconds: z.number().nullable(),
  rejected_findings: z.number().int(),
  // Ниже — расширения ТЗ, их нет в §8.2: ссылка на источник, запрос на изменения, итог.
  change_request: ChangeRequestLinkSchema.nullable(),
  merge_request: MergeRequestSummarySchema.nullable(),
  verdict: z.enum(VERDICTS).nullable(),
  /** Общая оценка изменений, 0–100. */
  score: z.number().min(0).max(100).nullable(),
})

export type ReviewRun = z.infer<typeof ReviewRunSchema>
export type ChangeRequestLink = z.infer<typeof ChangeRequestLinkSchema>
export type RunTrigger = ReviewRun['trigger']
export type MergeRequestSummary = z.infer<typeof MergeRequestSummarySchema>
export type Verdict = (typeof VERDICTS)[number]

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function isKnownStatus(status: string): status is KnownRunStatus {
  return (KNOWN_STATUSES as readonly string[]).includes(status)
}
