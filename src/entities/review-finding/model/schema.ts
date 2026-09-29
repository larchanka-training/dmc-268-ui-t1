import { z } from 'zod'

export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const

export const ReviewFindingSchema = z.object({
  id: z.string(),
  review_run_id: z.string(),
  file_path: z.string(),
  side: z.enum(['old', 'new']),
  old_line: z.number().int().nullable(),
  new_line: z.number().int().nullable(),
  category: z.enum(['security', 'correctness', 'performance', 'readability']),
  severity: z.enum(SEVERITIES),
  message: z.string(),
  suggestion: z.string().nullable(),
  confidence: z.number().nullable(),
})

export const PublishedCommentSchema = z.object({
  id: z.string(),
  review_run_id: z.string(),
  finding_id: z.string().nullable(),
  provider_comment_id: z.string(),
  kind: z.enum(['summary', 'inline']),
  published_at: z.string(),
})

/** Ответ `GET /review-runs/{run_id}/findings`: замечания и факты их публикации. */
export const FindingsResponseSchema = z.object({
  findings: z.array(ReviewFindingSchema),
  published_comments: z.array(PublishedCommentSchema),
})

export type ReviewFinding = z.infer<typeof ReviewFindingSchema>
export type PublishedComment = z.infer<typeof PublishedCommentSchema>
export type FindingsResponse = z.infer<typeof FindingsResponseSchema>
export type Severity = ReviewFinding['severity']
export type FindingCategory = ReviewFinding['category']
export type DiffSide = ReviewFinding['side']
