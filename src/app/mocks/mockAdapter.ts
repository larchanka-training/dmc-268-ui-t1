import { ApiError, type ApiTransport } from '../../shared/api'
import type { ConnectRepositoryRequest } from '../../entities/repository'
import { reviewExtrasPath, reviewPath, type ReviewRunResponse } from '../../pages/review-run'
import { mockExtras, mockReview } from './fixtures'
import type { MockServer } from './mockServer'
import { createRepositoryStore } from './repositories'

/**
 * Mock adapter с той же границей, что и HTTP-клиент: пути и формы ответов — как в контракте
 * бэкенда, ответ отдаётся как `unknown` и проверяется схемой сущности.
 *
 * С `server` прогон «идёт»: статус берётся из текущего шага сценария, того же, что видит
 * mock-поток событий. Пока прогон не завершён, замечаний, публикаций и вердикта нет; к
 * завершению они приходят из фикстуры. Без `server` отдаётся готовый завершённый прогон.
 *
 * Прогон в фикстуре один, `/reviews/run-42`; любой другой путь — 404, как у бэкенда.
 */
export function createMockAdapter({
  latencyMs = 250,
  server,
}: { latencyMs?: number; server?: MockServer } = {}): ApiTransport {
  const repositories = createRepositoryStore()

  const runNow = (): ReviewRunResponse => {
    // Копия, как после сети: UI не должен мутировать фикстуры.
    const review = structuredClone(mockReview)
    if (!server) return review
    const index = server.currentIndex()
    const step = server.scenario[index]
    const finished = step.status === 'completed'
    return {
      ...review,
      status: step.status,
      last_progress_at: new Date(server.enteredAt(index)).toISOString(),
      failed_stage: step.failed_stage ?? null,
      failure_reason: step.failure_reason ?? null,
      findings: finished ? review.findings : [],
      published_comments: finished ? review.published_comments : [],
    }
  }

  const get = (path: string): unknown => {
    const route = path.split('?')[0]
    if (route === '/repositories') return repositories.list()
    if (route === '/repositories/available') return repositories.available()
    if (route === reviewPath(mockReview.id)) return runNow()
    if (route === reviewExtrasPath(mockReview.id)) {
      const extras = structuredClone(mockExtras)
      const finished = !server || server.scenario[server.currentIndex()].status === 'completed'
      return finished ? extras : { ...extras, verdict: null, score: null }
    }
    throw new ApiError(404, `Нет такого ресурса: ${path}`, 'ROUTE_NOT_FOUND')
  }

  const post = (path: string, body: unknown): unknown => {
    if (path === '/repositories') return repositories.connect(body as ConnectRepositoryRequest)
    throw new ApiError(404, `Нет такого ресурса: ${path}`, 'ROUTE_NOT_FOUND')
  }

  const respond = (answer: () => unknown) =>
    new Promise<unknown>((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(answer())
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }, latencyMs)
    })

  return {
    get: (path) => respond(() => get(path)),
    post: (path, body) => respond(() => post(path, body)),
  }
}
