import { buildHunk, withLineIds, type DiffFile, type DiffFileSummary } from '../entities/diff'
import type { PublishedComment } from '../entities/published-comment'
import type { ReviewFinding } from '../entities/review-finding'
import type { ReviewRun } from '../entities/review-run'
import type { ReviewRunAction } from '../entities/review-run-action'

export { buildHunk as hunk }

export function makeReviewRun(overrides: Partial<ReviewRun> = {}): ReviewRun {
  return {
    id: 'run-1',
    head_sha: 'b3e1f0c9a8d7e6f5',
    base_sha: 'a1c2e3f4b5d6a7c8',
    status: 'completed',
    trigger: 'webhook',
    created_at: '2026-09-20T14:05:00Z',
    updated_at: '2026-09-20T14:07:14Z',
    last_progress_at: '2026-09-20T14:07:14Z',
    failure_reason: null,
    model: 'claude-sonnet-5',
    tokens_used: 18432,
    duration_seconds: 134,
    rejected_findings: 0,
    change_request: null,
    merge_request: {
      title: 'Чтение токена из окружения',
      author: 'a.petrova',
      source_branch: 'feat/env-token',
      target_branch: 'develop',
    },
    verdict: 'request_changes',
    score: 42,
    ...overrides,
  }
}

/** Идентификаторы hunk и строк выводятся из пути, как в mock-данных приложения. */
export function makeDiffFile(overrides: Partial<DiffFile> = {}): DiffFile {
  return withLineIds({
    path: 'src/example.ts',
    previous_path: null,
    status: 'modified',
    is_binary: false,
    language: 'typescript',
    hunks: [],
    ...overrides,
  })
}

export function makeFileSummary(overrides: Partial<DiffFileSummary> = {}): DiffFileSummary {
  return {
    path: 'src/example.ts',
    previous_path: null,
    status: 'modified',
    additions: 1,
    deletions: 1,
    findings_count: 0,
    is_binary: false,
    ...overrides,
  }
}

export function makeFinding(overrides: Partial<ReviewFinding> = {}): ReviewFinding {
  return {
    id: 'finding-1',
    file_path: 'src/example.ts',
    side: 'new',
    old_line: null,
    new_line: 1,
    category: 'correctness',
    severity: 'high',
    message: 'Ошибка не обрабатывается.',
    suggestion: null,
    confidence: 0.8,
    ...overrides,
  }
}

export function makePublishedComment(overrides: Partial<PublishedComment> = {}): PublishedComment {
  return {
    finding_id: 'finding-1',
    provider_comment_id: '1001',
    kind: 'inline',
    published_at: '2026-09-20T14:07:10Z',
    ...overrides,
  }
}

export function makeAction(overrides: Partial<ReviewRunAction> = {}): ReviewRunAction {
  return {
    id: 'action-1',
    review_run_id: 'run-1',
    position: 1,
    tool: 'get_diff',
    status: 'completed',
    request_preview: null,
    response_preview: null,
    error: null,
    started_at: '2026-09-20T14:05:10Z',
    duration_seconds: 2,
    ...overrides,
  }
}
