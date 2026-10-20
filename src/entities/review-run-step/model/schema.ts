import { z } from 'zod'

import type { ApiSchemas, MatchesContract } from '@/shared/api/contract'

export const STEP_STAGES = [
  'fetching_diff',
  'building_context',
  'analysing',
  'verifying',
  'publishing',
] as const

/** Шаг воркера в прогоне (`ReviewRunStepResponse` контракта): без запросов и ответов модели. */
export const ReviewRunStepSchema = z.object({
  stage: z.enum(STEP_STAGES),
  status: z.enum(['running', 'completed', 'failed']),
  started_at: z.string(),
  duration_seconds: z.number().nullable(),
  tokens_used: z.number().int().nullable(),
  error_code: z.string().nullable(),
})

/** Ответ `GET /api/v1/reviews/{id}/steps`. */
export const ReviewRunStepListSchema = z.object({ items: z.array(ReviewRunStepSchema) })

export type ReviewRunStep = z.infer<typeof ReviewRunStepSchema>
export type StepStage = ReviewRunStep['stage']
export type StepStatus = ReviewRunStep['status']

const contractCheck: MatchesContract<
  z.infer<typeof ReviewRunStepListSchema>,
  ApiSchemas['ReviewRunStepListResponse']
> = true
void contractCheck

export const STAGE_LABEL: Record<StepStage, string> = {
  fetching_diff: 'Получение диффа',
  building_context: 'Сбор контекста',
  analysing: 'Анализ LLM',
  verifying: 'Проверка замечаний',
  publishing: 'Публикация',
}
