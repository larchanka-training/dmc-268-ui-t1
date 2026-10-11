import { ApiError, type ApiTransport } from '../../shared/api'
import { MOCK_REVIEW_PATH } from '../../pages/review-run'
import { mockReviewState } from './fixtures'

/**
 * Временный adapter с той же границей, что и будущий HTTP-клиент: отдаёт `unknown`,
 * который проверяется схемой `MockReviewState` до передачи компонентам.
 */
export function createMockAdapter({ latencyMs = 250 }: { latencyMs?: number } = {}): ApiTransport {
  return {
    get: (path) =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (path !== MOCK_REVIEW_PATH) {
            reject(new ApiError(404, `Нет такого ресурса: ${path}`))
            return
          }
          // Копия, как после сети: UI не должен мутировать фикстуры.
          resolve(structuredClone(mockReviewState))
        }, latencyMs)
      }),
  }
}
