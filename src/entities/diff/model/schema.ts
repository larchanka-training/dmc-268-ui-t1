import { z } from 'zod'

const FileStatusSchema = z.enum(['added', 'modified', 'deleted', 'renamed'])

export const DiffLineSchema = z.object({
  kind: z.enum(['added', 'removed', 'context']),
  old_line: z.number().int().nullable(),
  new_line: z.number().int().nullable(),
  content: z.string(),
})

export const DiffHunkSchema = z.object({
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
