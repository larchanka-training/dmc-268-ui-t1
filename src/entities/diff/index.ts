export {
  DiffFileSchema,
  DiffFileSummarySchema,
  DiffHunkSchema,
  DiffLineSchema,
} from './model/schema'
export type { DiffFile, DiffFileStatus, DiffFileSummary, DiffHunk, DiffLine } from './model/schema'
export { toUnifiedDiff } from './lib/toUnifiedDiff'
export { diffKeys, useDiffFile, useDiffFiles } from './api/useDiff'
export { indexLines } from './lib/indexLines'
export type { LineIndex } from './lib/indexLines'
