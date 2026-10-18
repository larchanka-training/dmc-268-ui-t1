import { z } from 'zod'

import type { ApiSchemas, MatchesContract } from '@/shared/api/contract'

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

// Находка прогона из ответа `GET /reviews/{id}` — ровно `ReviewRunFinding` контракта.
const contractCheck: MatchesContract<ReviewFinding, ApiSchemas['ReviewRunFinding']> = true
void contractCheck
export type Severity = ReviewFinding['severity']
export type FindingCategory = ReviewFinding['category']
export type DiffSide = ReviewFinding['side']
