import { ApiError, type ApiTransport } from '../../shared/api'
import { mockReviewPath } from '../../pages/review-run'
import { mockReviewState } from './fixtures'
import type { MockServer } from './mockServer'

/**
 * Временный adapter с той же границей, что и будущий HTTP-клиент: отдаёт `unknown`,
 * который проверяется схемой `MockReviewState` до передачи компонентам.
 *
 * С `server` прогон «идёт»: статус берётся из текущего шага сценария, того же, что видит
 * mock-поток событий. Пока прогон не завершён, вердикта и замечаний нет; к завершению
 * они приходят из фикстуры. Без `server` отдаётся готовый завершённый прогон.
 *
 * Прогон в фикстуре один, `/reviews/run-42`; любой другой id — 404, как у бэкенда.
 */
export function createMockAdapter({
  latencyMs = 250,
  server,
}: { latencyMs?: number; server?: MockServer } = {}): ApiTransport {
  return {
    get: (path) =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (path !== mockReviewPath(mockReviewState.run.id)) {
            reject(new ApiError(404, `Нет такого ресурса: ${path}`))
            return
          }
          // Копия, как после сети: UI не должен мутировать фикстуры.
          const state = structuredClone(mockReviewState)
          if (server) {
            const index = server.currentIndex()
            const step = server.scenario[index]
            state.run = {
              ...state.run,
              status: step.status,
              last_progress_at: new Date(server.enteredAt(index)).toISOString(),
              failed_stage: step.failed_stage ?? null,
              failure_reason: step.failure_reason ?? null,
            }
            if (step.status !== 'completed') {
              state.run.verdict = null
              state.run.score = null
              state.findings = []
              state.published_comments = []
            }
          }
          resolve(state)
        }, latencyMs)
      }),
  }
}
