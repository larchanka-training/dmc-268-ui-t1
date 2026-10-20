import { z } from 'zod'

import type { ApiSchemas, MatchesContract } from '@/shared/api/contract'

/**
 * UI-модели диффа: строки с идентификаторами и признаком свёрнутого контекста. Их строит
 * `toDiffFile` из ответа `GET /reviews/{id}/diff` (`ReviewDiffSchema` ниже).
 */

const FileStatusSchema = z.enum(['added', 'modified', 'deleted', 'renamed'])

export const DiffLineSchema = z.object({
  id: z.string(),
  kind: z.enum(['added', 'removed', 'context']),
  old_line: z.number().int().nullable(),
  new_line: z.number().int().nullable(),
  content: z.string(),
  /** Контекстная строка, которая по умолчанию свёрнута и раскрывается в `DiffHunk`. */
  is_collapsed_context: z.boolean(),
})

export const DiffHunkSchema = z.object({
  id: z.string(),
  header: z.string(),
  old_start: z.number().int(),
  old_count: z.number().int(),
  new_start: z.number().int(),
  new_count: z.number().int(),
  lines: z.array(DiffLineSchema),
})

export const DiffFileSummarySchema = z.object({
  path: z.string(),
  previous_path: z.string().nullable(),
  status: FileStatusSchema,
  additions: z.number().int(),
  deletions: z.number().int(),
  findings_count: z.number().int(),
  is_binary: z.boolean(),
})

export const DiffFileSchema = z.object({
  path: z.string(),
  previous_path: z.string().nullable(),
  status: FileStatusSchema,
  is_binary: z.boolean(),
  language: z.string().nullable(),
  hunks: z.array(DiffHunkSchema),
})

export type DiffLine = z.infer<typeof DiffLineSchema>
export type DiffHunk = z.infer<typeof DiffHunkSchema>
export type DiffFileSummary = z.infer<typeof DiffFileSummarySchema>
export type DiffFile = z.infer<typeof DiffFileSchema>
export type DiffFileStatus = z.infer<typeof FileStatusSchema>

/** Ответ `GET /api/v1/reviews/{id}/diff` — ровно `ReviewDiffResponse` контракта. */
export const ReviewDiffSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      previous_path: z.string().nullable(),
      status: FileStatusSchema,
      is_binary: z.boolean(),
      language: z.string().nullable(),
      additions: z.number().int(),
      deletions: z.number().int(),
      hunks: z.array(
        DiffHunkSchema.omit({ id: true, lines: true }).extend({
          lines: z.array(DiffLineSchema.omit({ id: true, is_collapsed_context: true })),
        }),
      ),
    }),
  ),
})

export type ReviewDiff = z.infer<typeof ReviewDiffSchema>
export type ApiDiffFile = ReviewDiff['files'][number]

const contractCheck: MatchesContract<ReviewDiff, ApiSchemas['ReviewDiffResponse']> = true
void contractCheck
