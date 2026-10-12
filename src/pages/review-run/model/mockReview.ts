import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { DiffFileSchema, DiffFileSummarySchema } from '../../../entities/diff'
import { PublishedCommentSchema } from '../../../entities/published-comment'
import { ReviewFindingSchema } from '../../../entities/review-finding'
import { ReviewRunSchema } from '../../../entities/review-run'
import { ReviewRunActionSchema } from '../../../entities/review-run-action'
import { parseResponse, useTransport } from '../../../shared/api'

/** Всё, что нужно экрану одного прогона (FRONTEND_ARCHITECTURE.md §8.1). */
export const MockReviewStateSchema = z.object({
  run: ReviewRunSchema,
  files: z.array(DiffFileSummarySchema),
  diffs_by_path: z.record(z.string(), DiffFileSchema),
  findings: z.array(ReviewFindingSchema),
  published_comments: z.array(PublishedCommentSchema),
  actions: z.array(ReviewRunActionSchema),
})

export type MockReviewState = z.infer<typeof MockReviewStateSchema>

/** Путь mock-ресурса прогона; до REST-контракта экрана — один ресурс на всё, что видно на экране. */
export function mockReviewPath(reviewId: string) {
  return `/mock-review/${encodeURIComponent(reviewId)}`
}

/** Ключ кэша прогона. Новый массив на каждый вызов: в компоненте его держат в `useMemo`. */
export function mockReviewKey(reviewId: string) {
  return ['mock-review', reviewId] as const
}

export function useMockReview(reviewId: string) {
  const transport = useTransport()
  const path = mockReviewPath(reviewId)
  return useQuery({
    queryKey: mockReviewKey(reviewId),
    queryFn: async () => parseResponse(MockReviewStateSchema, path, await transport.get(path)),
  })
}
