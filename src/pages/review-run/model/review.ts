import { replaceEqualDeep, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { ReviewDiffSchema } from '../../../entities/diff'
import { PublishedCommentSchema } from '../../../entities/published-comment'
import { ReviewFindingSchema } from '../../../entities/review-finding'
import { mergeRunSnapshot, ReviewRunSchema } from '../../../entities/review-run'
import { ReviewRunStepListSchema } from '../../../entities/review-run-step'
import { parseResponse, useTransport } from '../../../shared/api'
import type { ApiSchemas, MatchesContract } from '../../../shared/api/contract'

/** Ответ `GET /api/v1/reviews/{id}`: прогон, его замечания и опубликованные комментарии. */
export const ReviewRunResponseSchema = ReviewRunSchema.extend({
  findings: z.array(ReviewFindingSchema),
  published_comments: z.array(PublishedCommentSchema),
})

export type ReviewRunResponse = z.infer<typeof ReviewRunResponseSchema>

// Статус шире enum контракта намеренно (`ReviewRunSchema.status`), остальное — поле в поле.
const contractCheck: MatchesContract<
  Omit<ReviewRunResponse, 'status'>,
  Omit<ApiSchemas['ReviewRunResponse'], 'status'>
> = true
void contractCheck

export function reviewPath(reviewId: string) {
  return `/reviews/${encodeURIComponent(reviewId)}`
}

export function reviewDiffPath(reviewId: string) {
  return `${reviewPath(reviewId)}/diff`
}

export function reviewStepsPath(reviewId: string) {
  return `${reviewPath(reviewId)}/steps`
}

/**
 * Ключ кэша прогона. Ключи диффа и шагов начинаются с него: инвалидация по завершении прогона
 * обновляет все запросы экрана. Новый массив на каждый вызов — в компоненте его держат в `useMemo`.
 */
export function reviewKey(reviewId: string) {
  return ['review', reviewId] as const
}

/**
 * Каждая запись в кэш прогона — ответ запроса и патч события — проходит через
 * `mergeRunSnapshot`: снимок, прочитанный сервером до уже применённого события, не откатывает
 * статус. Затем — обычное структурное разделение TanStack Query.
 */
function keepNewerStatus(old: unknown, next: unknown): unknown {
  const merged = mergeRunSnapshot(old as ReviewRunResponse | undefined, next as ReviewRunResponse)
  return replaceEqualDeep(old, merged)
}

export function useReviewRun(reviewId: string) {
  const transport = useTransport()
  const path = reviewPath(reviewId)
  return useQuery({
    queryKey: reviewKey(reviewId),
    queryFn: async () => parseResponse(ReviewRunResponseSchema, path, await transport.get(path)),
    structuralSharing: keepNewerStatus,
  })
}

/** Поля прогона, по которым видно, есть ли у него дифф вообще. */
type DiffSource = Pick<ReviewRunResponse, 'base_sha' | 'diff_expired_at'>

/**
 * Можно ли запросить дифф прогона. Нельзя без `base_sha` (он пуст только у старых прогонов,
 * записанных до миграции `0002`) и после удаления диффа по сроку хранения (`diff_expired_at`):
 * бэкенд ответил бы постоянным отказом, а причину экран знает и без запроса.
 */
export function canRequestDiff(run: DiffSource): boolean {
  return run.base_sha !== null && run.diff_expired_at === null
}

/**
 * Дифф прогона. Бэкенд его реализует (dmc-268-api-t1#87), поэтому любой отказ — ошибка
 * запроса: экран показывает причину (`diffProblem`), а не прячет дифф молча. Пока прогон
 * не загружен или дифф заведомо недоступен (`canRequestDiff`), запроса нет.
 */
export function useReviewDiff(reviewId: string, run: DiffSource | undefined) {
  const transport = useTransport()
  const path = reviewDiffPath(reviewId)
  return useQuery({
    queryKey: [...reviewKey(reviewId), 'diff'] as const,
    queryFn: async () => parseResponse(ReviewDiffSchema, path, await transport.get(path)),
    enabled: run !== undefined && canRequestDiff(run),
  })
}

/**
 * Шаги прогона. `GET /steps` реализован (dmc-268-api-t1#90), поэтому `404` — «прогона нет»,
 * это ошибка, а не «шагов нет».
 */
export function useReviewSteps(reviewId: string) {
  const transport = useTransport()
  const path = reviewStepsPath(reviewId)
  return useQuery({
    queryKey: [...reviewKey(reviewId), 'steps'] as const,
    queryFn: async () => parseResponse(ReviewRunStepListSchema, path, await transport.get(path)),
  })
}
