export {
  DiffFileSchema,
  DiffFileSummarySchema,
  DiffHunkSchema,
  DiffLineSchema,
  ReviewDiffSchema,
} from './model/schema'
export type {
  ApiDiffFile,
  DiffFile,
  DiffFileStatus,
  DiffFileSummary,
  DiffHunk,
  DiffLine,
  ReviewDiff,
} from './model/schema'
export { toDiffFile, VISIBLE_CONTEXT } from './lib/fromApi'
export { buildHunk, toApiDiffFile, withLineIds } from './lib/build'
export { collapseContext } from './lib/collapseContext'
export type { CollapsedGap } from './lib/collapseContext'
export { indexLines } from './lib/indexLines'
export type { LineIndex } from './lib/indexLines'
export { toUnifiedDiff } from './lib/toUnifiedDiff'
