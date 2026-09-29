import { z } from 'zod'

export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const

/** Замечание модели после валидации и дедупликации (FRONTEND_ARCHITECTURE.md §8.2). */
export const ReviewFindingSchema = z.object({
  id: z.string(),
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

export type ReviewFinding = z.infer<typeof ReviewFindingSchema>
export type Severity = ReviewFinding['severity']
export type FindingCategory = ReviewFinding['category']
export type DiffSide = ReviewFinding['side']
