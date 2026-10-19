import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { DiffFileSchema, DiffFileSummarySchema } from '../../../entities/diff'
import { PublishedCommentSchema } from '../../../entities/published-comment'
import { ReviewFindingSchema } from '../../../entities/review-finding'
import { ReviewRunSchema, VERDICTS } from '../../../entities/review-run'
import { ReviewRunActionSchema } from '../../../entities/review-run-action'
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

/**
 * Данные экрана, которых в контракте нет: вердикт и оценка, дифф, действия воркера — решения
 * 1, 2 и 4 в dmc-268-ui-t1#37. Отдаёт их только mock adapter; у бэкенда этого пути нет, и экран
 * показывает прогон без них.
 */
export const ReviewExtrasSchema = z.object({
  verdict: z.enum(VERDICTS).nullable(),
  /** Общая оценка изменений, 0–100. */
  score: z.number().min(0).max(100).nullable(),
  files: z.array(DiffFileSummarySchema),
  diffs_by_path: z.record(z.string(), DiffFileSchema),
  actions: z.array(ReviewRunActionSchema),
})

export type ReviewExtras = z.infer<typeof ReviewExtrasSchema>

export function reviewPath(reviewId: string) {
  return `/reviews/${encodeURIComponent(reviewId)}`
}

/** Путь mock-ресурса с данными вне контракта. */
export function reviewExtrasPath(reviewId: string) {
  return `/mock/reviews/${encodeURIComponent(reviewId)}/extras`
}

/**
 * Ключ кэша прогона. Ключ дополнений начинается с него: инвалидация по завершении прогона
 * обновляет оба запроса. Новый массив на каждый вызов — в компоненте его держат в `useMemo`.
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

/** Дополнения экрана; `null` — источника нет (бэкенд), экран обходится без них. */
export function useReviewExtras(reviewId: string) {
  const transport = useTransport()
  const path = reviewExtrasPath(reviewId)
  return useQuery({
    queryKey: [...reviewKey(reviewId), 'extras'] as const,
    queryFn: async (): Promise<ReviewExtras | null> => {
      try {
        return parseResponse(ReviewExtrasSchema, path, await transport.get(path))
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
  })
}
