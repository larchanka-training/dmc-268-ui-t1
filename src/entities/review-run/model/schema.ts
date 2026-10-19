import { z } from 'zod'

import type { ApiSchemas, MatchesContract } from '@/shared/api/contract'

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

/** Запрос на изменение прогона вместе с репозиторием (`MergeRequestSummary` контракта). */
export const MergeRequestSummarySchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  author: z.string(),
  source_branch: z.string(),
  target_branch: z.string(),
  state: z.enum(['open', 'closed', 'merged']),
  // Ссылку собирает бэкенд; `null` — формат ссылок провайдера не поддержан.
  url: z.string().nullable(),
  repository: z.object({
    id: z.string(),
    provider: z.enum(['github', 'gitlab']),
    full_name: z.string(),
  }),
})

/** Итог ревью. В контракте его нет: фронт выводит его из замечаний (решение 1 в dmc-268-ui-t1#37). */
export const VERDICTS = ['approve', 'comment', 'request_changes'] as const

/** Прогон из `GET /api/v1/reviews/{id}` без вложенных списков (`ReviewRunResponse` контракта). */
export const ReviewRunSchema = z.object({
  id: z.string(),
  merge_request_id: z.string(),
  merge_request: MergeRequestSummarySchema,
  head_sha: z.string(),
  base_sha: z.string().nullable(),
  // Чужой enum будет расти: незнакомый статус не должен ронять страницу,
  // поэтому схема принимает любую строку, а UI считает его нетерминальным.
  status: z.string(),
  trigger: z.enum(['webhook', 'manual', 'mention']),
  model: z.string().nullable(),
  tokens_used: z.number().int().nullable(),
  rejected_findings: z.number().int(),
  duration_seconds: z.number().nullable(),
  failure_reason: z.string().nullable(),
  /** Этап, на котором упал прогон; `null` — не сообщён. */
  failed_stage: z.enum(RUN_STAGES).nullable(),
  last_progress_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ReviewRun = z.infer<typeof ReviewRunSchema>
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
  last_progress_at: z.string(),
  failed_stage: z.enum(RUN_STAGES).nullable(),
  failure_reason: z.string().nullable(),
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

/** Статус шире enum контракта намеренно (см. `ReviewRunSchema.status`), остальное — поле в поле. */
type WithoutStatus<T> = Omit<T, 'status'>

const contractCheck: [
  MatchesContract<
    WithoutStatus<ReviewRun>,
    WithoutStatus<Omit<ApiSchemas['ReviewRunResponse'], 'findings' | 'published_comments'>>
  >,
  MatchesContract<WithoutStatus<RunStatusEvent>, WithoutStatus<ApiSchemas['ReviewRunStatusEvent']>>,
] = [true, true]
void contractCheck
