import { replaceEqualDeep, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { ReviewDiffSchema } from '../../../entities/diff'
import { PublishedCommentSchema } from '../../../entities/published-comment'
import { ReviewFindingSchema } from '../../../entities/review-finding'
import { mergeRunSnapshot, ReviewRunSchema } from '../../../entities/review-run'
import { ReviewRunStepListSchema } from '../../../entities/review-run-step'
import { ApiError, parseResponse, useTransport } from '../../../shared/api'
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

/**
 * Часть прогона, которую бэкенд может не отдавать: ответ со статусом из `absent` — `null`,
 * экран показывает прогон без неё. Остальные ошибки — ошибка запроса.
 */
function usePlannedPart<T extends z.ZodType>(
  reviewId: string,
  part: string,
  path: string,
  schema: T,
  absent: readonly number[],
) {
  const transport = useTransport()
  return useQuery({
    queryKey: [...reviewKey(reviewId), part] as const,
    queryFn: async (): Promise<z.infer<T> | null> => {
      try {
        return parseResponse(schema, path, await transport.get(path))
      } catch (error) {
        if (error instanceof ApiError && absent.includes(error.status)) return null
        throw error
      }
    },
  })
}

/**
 * Дифф прогона; `null` — бэкенд его пока не отдаёт (`501`, `404` от источника без пути).
 *
 * TODO: когда бэкенд реализует дифф (dmc-268-api-t1#87), убрать `404` — настоящий `404`
 * на под-ресурсе сейчас маскируется под «части нет».
 */
export function useReviewDiff(reviewId: string) {
  return usePlannedPart(reviewId, 'diff', reviewDiffPath(reviewId), ReviewDiffSchema, [501, 404])
}

/**
 * Шаги прогона; `null` — бэкенд их не отдаёт (`501`). `GET /steps` реализован
 * (dmc-268-api-t1#90), поэтому `404` — «прогона нет», это ошибка, а не «части нет».
 */
export function useReviewSteps(reviewId: string) {
  return usePlannedPart(
    reviewId,
    'steps',
    reviewStepsPath(reviewId),
    ReviewRunStepListSchema,
    [501],
  )
}
