import {
  toDiffFile,
  type DiffFile,
  type DiffFileSummary,
  type ReviewDiff,
} from '../../../entities/diff'
import type { ReviewFinding } from '../../../entities/review-finding'

/** Данные рабочей области из диффа контракта: список файлов с числом замечаний и UI-дифф. */
export function toWorkspace(
  diff: ReviewDiff,
  findings: readonly ReviewFinding[],
): { files: DiffFileSummary[]; diffsByPath: Record<string, DiffFile> } {
  return {
    files: diff.files.map((file) => ({
      path: file.path,
      previous_path: file.previous_path,
      status: file.status,
      is_binary: file.is_binary,
      additions: file.additions,
      deletions: file.deletions,
      findings_count: findings.filter((finding) => finding.file_path === file.path).length,
    })),
    diffsByPath: Object.fromEntries(diff.files.map((file) => [file.path, toDiffFile(file)])),
  }
}
