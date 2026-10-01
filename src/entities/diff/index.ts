export {
  DiffFileSchema,
  DiffFileSummarySchema,
  DiffHunkSchema,
  DiffLineSchema,
} from './model/schema'
export type { DiffFile, DiffFileStatus, DiffFileSummary, DiffHunk, DiffLine } from './model/schema'
export { buildHunk, withLineIds } from './lib/build'
export { collapseContext } from './lib/collapseContext'
export type { CollapsedGap } from './lib/collapseContext'
export { indexLines } from './lib/indexLines'
export type { LineIndex } from './lib/indexLines'
export { toUnifiedDiff } from './lib/toUnifiedDiff'
