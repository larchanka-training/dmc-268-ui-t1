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
  /** Пункт `.review/rules.md`, по которому выпущено замечание; `null` — по стандартным критериям. */
  rule: z
    .object({
      name: z.string(),
      check: z.number().int(),
      check_text: z.string(),
    })
    .nullable(),
  /** Находка прошлого прогона, чей тред бота уже говорит об этой проблеме; `null` — своя публикация. */
  covered_by_finding_id: z.string().nullable(),
})

export type ReviewFinding = z.infer<typeof ReviewFindingSchema>

// Находка прогона из ответа `GET /reviews/{review_run_id}` — ровно `FindingResponse` контракта.
const contractCheck: MatchesContract<ReviewFinding, ApiSchemas['FindingResponse']> = true
void contractCheck
export type Severity = ReviewFinding['severity']
export type FindingCategory = ReviewFinding['category']
export type DiffSide = ReviewFinding['side']
