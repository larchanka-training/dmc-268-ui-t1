import { z } from 'zod'

/**
 * Mock-модель будущей истории worker (FRONTEND_ARCHITECTURE.md §8.2), не утверждённый
 * API-контракт. Preview намеренно `unknown`: формат согласуется вместе с API.
 */
export const ReviewRunActionSchema = z.object({
  id: z.string(),
  review_run_id: z.string(),
  position: z.number().int(),
  // Словарь tool закрыт на стороне worker, но UI показывает незнакомое значение нейтрально.
  tool: z.string(),
  status: z.enum(['running', 'completed', 'failed']),
  request_preview: z.unknown().nullable(),
  response_preview: z.unknown().nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
  started_at: z.string(),
  duration_seconds: z.number().nullable(),
})

export type ReviewRunAction = z.infer<typeof ReviewRunActionSchema>
export type ActionStatus = ReviewRunAction['status']

export function byPosition(a: ReviewRunAction, b: ReviewRunAction): number {
  return a.position - b.position
}
