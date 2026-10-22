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
  /** Итог второго прохода модели (Reflection Pass); `null` — анализ ещё не завершён. */
  verification: z.enum(['verified', 'not_required', 'unavailable']).nullable(),
  verifier_dropped_findings: z.number().int(),
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
 * Прогон строкой списка (`ReviewRunListItem` контракта): те же данные приходят в событиях `run.*`
 * общего потока `GET /api/v1/events`. `status` — любая строка, как в `ReviewRunSchema`.
 */
export const ReviewRunListItemSchema = z.object({
  id: z.string(),
  status: z.string(),
  trigger: z.enum(['webhook', 'manual', 'mention']),
  head_sha: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  last_progress_at: z.string(),
  duration_seconds: z.number().nullable(),
  failed_stage: z.enum(RUN_STAGES).nullable(),
  findings_count: z.number().int(),
  merge_request: MergeRequestSummarySchema,
})

export type ReviewRunListItem = z.infer<typeof ReviewRunListItemSchema>

/** События прогона в общем потоке; данные у всех — `ReviewRunListItem`. */
export const RUN_EVENT_TYPES = ['run.created', 'run.status_changed', 'run.finished'] as const

export type RunEventType = (typeof RUN_EVENT_TYPES)[number]

export function isRunEventType(type: string): type is RunEventType {
  return (RUN_EVENT_TYPES as readonly string[]).includes(type)
}

/**
 * Из двух версий строки новее та, у которой `updated_at` больше, при равном — пришедшая позже
 * (правило контракта `GET /api/v1/events`). Сравниваем моменты времени, а не строки: дробная
 * часть секунд у бэкенда переменной длины.
 */
export function isSameOrNewer(incoming: string, current: string): boolean {
  return Date.parse(incoming) >= Date.parse(current)
}

/**
 * Накладывает событие прогона на прогон: обновляются поля статуса и прогресса, остальное не
 * трогаем. Событие старше данных в кэше проигрывает: прогон возвращается как есть.
 */
export function applyRunEvent<T extends ReviewRun>(run: T, event: ReviewRunListItem): T {
  if (!isSameOrNewer(event.updated_at, run.updated_at)) return run
  return {
    ...run,
    status: event.status,
    last_progress_at: event.last_progress_at,
    failed_stage: event.failed_stage,
    duration_seconds: event.duration_seconds,
    updated_at: event.updated_at,
  }
}

/** Статус шире enum контракта намеренно (см. `ReviewRunSchema.status`), остальное — поле в поле. */
type WithoutStatus<T> = Omit<T, 'status'>

const contractCheck: [
  MatchesContract<
    WithoutStatus<ReviewRun>,
    WithoutStatus<Omit<ApiSchemas['ReviewRunResponse'], 'findings' | 'published_comments'>>
  >,
  MatchesContract<WithoutStatus<ReviewRunListItem>, WithoutStatus<ApiSchemas['ReviewRunListItem']>>,
  MatchesContract<RunEventType, Exclude<ApiSchemas['StreamEventType'], 'ping'>>,
] = [true, true, true]
void contractCheck
