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

export const MOCK_REVIEW_PATH = '/mock-review'
export const mockReviewKey = ['mock-review'] as const

export function useMockReview() {
  const transport = useTransport()
  return useQuery({
    queryKey: mockReviewKey,
    queryFn: async () =>
      parseResponse(MockReviewStateSchema, MOCK_REVIEW_PATH, await transport.get(MOCK_REVIEW_PATH)),
  })
}
