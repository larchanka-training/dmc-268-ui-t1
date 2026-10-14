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

/** Этапы идущего прогона по порядку: ровно они показываются шагами прогресса. */
export const RUN_STAGES = ['building_context', 'analysing', 'publishing'] as const

export type RunStage = (typeof RUN_STAGES)[number]

export function isRunStage(value: string | null | undefined): value is RunStage {
  return (RUN_STAGES as readonly (string | null | undefined)[]).includes(value)
}

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
  failure_reason: z.string().nullable(),
  // Ответ GET /api/v1/reviews/{id} этих двух полей пока не отдаёт: они приходят событиями
  // статуса, поэтому отсутствие поля — то же, что `null`.
  last_progress_at: z.string().nullable().default(null),
  /** Этап, на котором упал прогон; `null` — не сообщён. */
  failed_stage: z.string().nullable().default(null),
  model: z.string().nullable(),
  tokens_used: z.number().int().nullable(),
  duration_seconds: z.number().nullable(),
  // GET /api/v1/reviews/{id} его пока не отдаёт (dmc-268-api-t1#36); нужен ли он — решаем в #18.
  rejected_findings: z.number().int().nullable().default(null),
  // Ниже — расширения ТЗ, их нет ни в §8.2, ни в ответе бэкенда: ссылка на источник, запрос на
  // изменения, итог. Отсутствие поля — то же, что `null`, чтобы экран не падал на ответе API.
  change_request: ChangeRequestLinkSchema.nullable().default(null),
  merge_request: MergeRequestSummarySchema.nullable().default(null),
  verdict: z.enum(VERDICTS).nullable().default(null),
  /** Общая оценка изменений, 0–100. */
  score: z.number().min(0).max(100).nullable().default(null),
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

/**
 * Событие `status` из `GET /api/v1/reviews/{id}/events` (контракт — в design.md change
 * `review-run-live-status`). `status` — любая строка, как в `ReviewRunSchema`.
 */
export const RunStatusEventSchema = z.object({
  review_run_id: z.string(),
  status: z.string(),
  last_progress_at: z.string().nullable().default(null),
  failed_stage: z.string().nullable().default(null),
  failure_reason: z.string().nullable().default(null),
})

export type RunStatusEvent = z.infer<typeof RunStatusEventSchema>

/** Накладывает событие на прогон: обновляются только поля статуса, остальное не трогаем. */
export function applyStatusEvent(run: ReviewRun, event: RunStatusEvent): ReviewRun {
  return {
    ...run,
    status: event.status,
    last_progress_at: event.last_progress_at,
    failed_stage: event.failed_stage,
    failure_reason: event.failure_reason,
  }
}
