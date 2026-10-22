import { buildHunk, withLineIds, type DiffFile, type DiffFileSummary } from '../entities/diff'
import type { PublishedComment } from '../entities/published-comment'
import type { ReviewFinding } from '../entities/review-finding'
import type { ReviewRun, ReviewRunListItem } from '../entities/review-run'
import type { ReviewRunStep } from '../entities/review-run-step'

export { buildHunk as hunk }

export function makeReviewRun(overrides: Partial<ReviewRun> = {}): ReviewRun {
  return {
    id: 'run-1',
    merge_request_id: 'mr-1',
    merge_request: {
      id: 'mr-1',
      number: 7,
      title: 'Чтение токена из окружения',
      author: 'a.petrova',
      source_branch: 'feat/env-token',
      target_branch: 'develop',
      state: 'open',
      url: null,
      repository: { id: 'repo-1', provider: 'github', full_name: 'acme/api' },
    },
    head_sha: 'b3e1f0c9a8d7e6f5',
    base_sha: 'a1c2e3f4b5d6a7c8',
    status: 'completed',
    trigger: 'webhook',
    model: 'claude-sonnet-5',
    tokens_used: 18432,
    rejected_findings: 0,
    verification: 'verified',
    verifier_dropped_findings: 0,
    duration_seconds: 134,
    failure_reason: null,
    failed_stage: null,
    last_progress_at: '2026-09-20T14:07:14Z',
    created_at: '2026-09-20T14:05:00Z',
    updated_at: '2026-09-20T14:07:14Z',
    ...overrides,
  }
}

/** Идентификаторы hunk и строк выводятся из пути, как в mock-данных приложения. */
/**
 * Строка прогона из события `run.*`: тот же прогон, что `makeReviewRun`, но `updated_at` позже,
 * чтобы событие по умолчанию было новее прогона в кэше.
 */
export function makeRunListItem(overrides: Partial<ReviewRunListItem> = {}): ReviewRunListItem {
  const run = makeReviewRun()
  return {
    id: run.id,
    status: 'analysing',
    trigger: run.trigger,
    head_sha: run.head_sha,
    created_at: run.created_at,
    updated_at: '2026-09-20T14:10:00Z',
    last_progress_at: '2026-09-20T14:10:00Z',
    duration_seconds: null,
    failed_stage: null,
    findings_count: 0,
    merge_request: run.merge_request,
    ...overrides,
  }
}

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
    rule: null,
    ...overrides,
  }
}

export function makePublishedComment(overrides: Partial<PublishedComment> = {}): PublishedComment {
  return {
    id: 'published-1',
    finding_id: 'finding-1',
    provider_comment_id: '1001',
    kind: 'inline',
    published_at: '2026-09-20T14:07:10Z',
    ...overrides,
  }
}

export function makeStep(overrides: Partial<ReviewRunStep> = {}): ReviewRunStep {
  return {
    stage: 'analysing',
    status: 'completed',
    started_at: '2026-09-20T14:05:10Z',
    duration_seconds: 2,
    tokens_used: null,
    error_code: null,
    ...overrides,
  }
}
