import type { DiffFileSummary } from '../../entities/diff'
import type { ReviewRun } from '../../entities/review-run'
import { ApiError, type ApiTransport } from '../../shared/api'
import { ACTIVE_RUN_ID, diffFiles, findings, publishedComments, runs } from './fixtures'

/** Этапы «живого» прогона: статус меняется со временем, чтобы было видно polling. */
const ACTIVE_STAGES = [
  'queued',
  'building_context',
  'analysing',
  'publishing',
  'completed',
] as const
const STAGE_MS = 3000

type Options = {
  latencyMs?: number
  now?: () => number
}

/**
 * Временный адаптер данных с той же границей, что и будущий HTTP-клиент: отдаёт `unknown`,
 * который entity API валидирует своей схемой.
 */
export function createMockTransport({
  latencyMs = 250,
  now = Date.now,
}: Options = {}): ApiTransport {
  let activeStartedAt: number | null = null

  const runState = (runId: string): ReviewRun | undefined => {
    const run = runs[runId]
    if (!run || runId !== ACTIVE_RUN_ID) return run

    activeStartedAt ??= now()
    const elapsed = now() - activeStartedAt
    const stage = Math.min(Math.floor(elapsed / STAGE_MS), ACTIVE_STAGES.length - 1)
    const status = ACTIVE_STAGES[stage]
    const done = status === 'completed'
    const at = new Date(Date.parse(run.created_at) + elapsed).toISOString()
    return {
      ...run,
      status,
      last_progress_at: at,
      updated_at: at,
      model: stage >= 2 ? 'claude-sonnet-5' : null,
      tokens_used: done ? 48213 : null,
      duration_seconds: done ? Math.round(elapsed / 1000) : null,
      rejected_findings: done ? 2 : 0,
      verdict: done ? 'request_changes' : null,
      score: done ? 38 : null,
    }
  }

  // Замечания появляются, когда прогон дошёл до публикации.
  const findingsOf = (run: ReviewRun) => {
    const ready = run.status === 'publishing' || run.status === 'completed'
    const own = <T extends { review_run_id: string }>(items: T[]) =>
      ready ? items.map((item) => ({ ...item, review_run_id: run.id })) : []
    return { findings: own(findings), published_comments: own(publishedComments) }
  }

  const route = (path: string): unknown => {
    const url = new URL(path, 'http://mock')
    const match = url.pathname.match(/^\/review-runs\/([^/]+)(?:\/(files|diff|findings))?$/)
    if (!match) throw new ApiError(404, `Нет такого ресурса: ${path}`)

    const [, runId, resource] = match
    const run = runState(decodeURIComponent(runId))
    if (!run) throw new ApiError(404, `Прогон ${runId} не найден`)

    switch (resource) {
      case undefined:
        return run
      case 'findings':
        return findingsOf(run)
      case 'files': {
        const current = findingsOf(run).findings
        return diffFiles.map((file): DiffFileSummary => ({
          path: file.path,
          previous_path: file.previous_path,
          status: file.status,
          is_binary: file.is_binary,
          additions: countLines(file.hunks, 'added'),
          deletions: countLines(file.hunks, 'removed'),
          findings_count: current.filter((item) => item.file_path === file.path).length,
        }))
      }
      case 'diff': {
        const file = diffFiles.find((item) => item.path === url.searchParams.get('path'))
        if (!file) throw new ApiError(404, `Файла нет в прогоне: ${url.searchParams.get('path')}`)
        return file
      }
    }
  }

  return {
    get: (path) =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            // Копия, как после сети: UI не должен мутировать фикстуры.
            resolve(structuredClone(route(path)))
          } catch (error) {
            reject(error)
          }
        }, latencyMs)
      }),
  }
}

function countLines(hunks: (typeof diffFiles)[number]['hunks'], kind: 'added' | 'removed'): number {
  return hunks.reduce(
    (sum, hunk) => sum + hunk.lines.filter((line) => line.kind === kind).length,
    0,
  )
}
