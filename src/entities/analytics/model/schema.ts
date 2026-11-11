import { z } from 'zod'

import type { ApiSchemas, MatchesContract } from '@/shared/api/contract'

/** Ответ `GET /api/v1/analytics` (`AnalyticsResponse` контракта; сверка — ниже). */
export const AnalyticsSchema = z.object({
  created_from: z.string(),
  created_to: z.string(),
  findings_by_day: z.array(
    z.object({
      date: z.string(),
      category: z.enum(['security', 'correctness', 'performance', 'readability']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      count: z.number().int(),
    }),
  ),
  runs: z.object({
    count: z.number().int(),
    average_duration_seconds: z.number().nullable(),
    p95_duration_seconds: z.number().nullable(),
  }),
  by_repository: z.array(
    z.object({
      repository_id: z.string(),
      full_name: z.string(),
      runs_count: z.number().int(),
      average_duration_seconds: z.number(),
      p95_duration_seconds: z.number(),
      findings_count: z.number().int(),
    }),
  ),
})

export type Analytics = z.infer<typeof AnalyticsSchema>
export type FindingsDayCount = Analytics['findings_by_day'][number]
export type RepositoryAnalytics = Analytics['by_repository'][number]

// Разобранный ответ совпадает с типом контракта поле в поле; разойдутся — упадёт typecheck.
const contractCheck: MatchesContract<Analytics, ApiSchemas['AnalyticsResponse']> = true
void contractCheck
