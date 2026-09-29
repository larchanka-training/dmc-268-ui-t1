import { z } from 'zod'

export const severitySchema = z.enum(['low', 'medium', 'high', 'critical'])
export type Severity = z.infer<typeof severitySchema>
export const reviewSchema = z.object({
  run: z.object({ id: z.string(), status: z.string(), headSha: z.string() }),
  files: z.array(z.object({ path: z.string(), additions: z.number(), deletions: z.number() })),
  diffsByPath: z.record(
    z.string(),
    z.object({
      path: z.string(),
      lines: z.array(
        z.object({
          id: z.string(),
          kind: z.enum(['added', 'removed', 'context']),
          oldLine: z.number().nullable(),
          newLine: z.number().nullable(),
          content: z.string(),
        }),
      ),
    }),
  ),
  findings: z.array(
    z.object({
      id: z.string(),
      filePath: z.string(),
      side: z.enum(['old', 'new']),
      oldLine: z.number().nullable(),
      newLine: z.number().nullable(),
      severity: severitySchema,
      message: z.string(),
    }),
  ),
  actions: z.array(
    z.object({
      id: z.string(),
      tool: z.string(),
      status: z.string(),
      durationSeconds: z.number(),
      preview: z.string(),
    }),
  ),
})
export type ReviewState = z.infer<typeof reviewSchema>
export type DiffLine = ReviewState['diffsByPath'][string]['lines'][number]
export type ReviewFinding = ReviewState['findings'][number]

export function parseReview(value: unknown): ReviewState {
  return reviewSchema.parse(value)
}
