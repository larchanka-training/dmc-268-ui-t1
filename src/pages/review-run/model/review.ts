import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { ReviewDiffSchema } from '../../../entities/diff'
import { PublishedCommentSchema } from '../../../entities/published-comment'
import { ReviewFindingSchema } from '../../../entities/review-finding'
import { ReviewRunSchema } from '../../../entities/review-run'
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

export function useReviewRun(reviewId: string) {
  const transport = useTransport()
  const path = reviewPath(reviewId)
  return useQuery({
    queryKey: reviewKey(reviewId),
    queryFn: async () => parseResponse(ReviewRunResponseSchema, path, await transport.get(path)),
  })
}

/**
 * Часть прогона, которую бэкенд ещё не реализовал: `501 NOT_IMPLEMENTED` (и `404` от источника
 * без этого пути) — `null`, экран показывает прогон без неё.
 */
function usePlannedPart<T extends z.ZodType>(
  reviewId: string,
  part: string,
  path: string,
  schema: T,
) {
  const transport = useTransport()
  return useQuery({
    queryKey: [...reviewKey(reviewId), part] as const,
    queryFn: async (): Promise<z.infer<T> | null> => {
      try {
        return parseResponse(schema, path, await transport.get(path))
      } catch (error) {
        if (error instanceof ApiError && (error.status === 501 || error.status === 404)) return null
        throw error
      }
    },
  })
}

/** Дифф прогона; `null` — бэкенд его пока не отдаёт. */
export function useReviewDiff(reviewId: string) {
  return usePlannedPart(reviewId, 'diff', reviewDiffPath(reviewId), ReviewDiffSchema)
}

/** Шаги прогона; `null` — бэкенд их пока не отдаёт. */
export function useReviewSteps(reviewId: string) {
  return usePlannedPart(reviewId, 'steps', reviewStepsPath(reviewId), ReviewRunStepListSchema)
}
