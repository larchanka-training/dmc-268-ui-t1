import { ApiError, type ApiTransport } from '../../shared/api'
import type { ConnectRepositoryRequest, RepositorySettingsUpdate } from '../../entities/repository'
import {
  reviewDiffPath,
  reviewPath,
  reviewStepsPath,
  type ReviewRunResponse,
} from '../../pages/review-run'
import { mockDiff, mockReview, mockSteps } from './fixtures'
import type { MockServer } from './mockServer'
import { createRepositoryStore } from './repositories'
import { createRepositorySettingsStore } from './repositorySettings'
import { createReviewRunStore } from './reviewRuns'

/**
 * Mock adapter с той же границей, что и HTTP-клиент: пути и формы ответов — как в контракте
 * бэкенда, ответ отдаётся как `unknown` и проверяется схемой сущности.
 *
 * С `server` прогон «идёт»: статус берётся из текущего шага сценария, того же, что видит
 * mock-поток событий. Пока прогон не завершён, замечаний, публикаций и шагов нет; к
 * завершению они приходят из фикстуры. Дифф есть сразу: его получают до анализа. Без `server` отдаётся готовый завершённый прогон.
 *
 * Экран прогона есть у одного прогона, `/reviews/run-42`; список `/reviews` — он, чужой прогон
 * потока и сгенерированные прогоны (`reviewRuns.ts`). Любой другой путь — 404, как у бэкенда.
 * Настройки и статус правил живут в своём store (`repositorySettings.ts`) по ручкам контракта
 * `GET/PUT /repositories/{id}/settings` и `GET /repositories/{id}/rules`; список прогонов
 * `/reviews` (в том числе с фильтром `repository_id`) отдаёт вкладке «Ревью» store
 * `reviewRuns.ts`.
 */
export function createMockAdapter({
  latencyMs = 250,
  server,
}: { latencyMs?: number; server?: MockServer } = {}): ApiTransport {
  const repositories = createRepositoryStore()
  const repositorySettings = createRepositorySettingsStore({
    findRepository: (repositoryId) => repositories.find(repositoryId),
    onAutoReviewChange: (repositoryId, enabled) =>
      repositories.setAutoReviewEnabled(repositoryId, enabled),
  })
  const reviewRuns = createReviewRunStore(server)

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
      // Строка меняется ровно на переходах сценария: так событие и снимок сравнимы по `updated_at`.
      updated_at: new Date(server.enteredAt(index)).toISOString(),
      failed_stage: step.failed_stage ?? null,
      failure_reason: step.failure_reason ?? null,
      findings: finished ? review.findings : [],
      published_comments: finished ? review.published_comments : [],
    }
  }

  /** Пройденные шаги и текущий — `running`; после завершения — все шаги из фикстуры. */
  const stepsNow = () => {
    const all = structuredClone(mockSteps)
    if (!server) return all
    const status = server.scenario[server.currentIndex()].status
    if (status === 'completed') return all
    const current = all.items.findIndex((step) => step.stage === status)
    if (current < 0) return { items: [] }
    const items = all.items.slice(0, current + 1)
    items[current] = {
      ...items[current],
      status: 'running',
      duration_seconds: null,
      error_code: null,
    }
    return { items }
  }

  const get = (path: string): unknown => {
    const [route, search = ''] = path.split('?')
    if (route === '/reviews') return reviewRuns.list(search)
    if (route === '/repositories') return repositories.list()
    // Один репозиторий и блок настроек — ручки контракта (api#113).
    const repositoryRoute = /^\/repositories\/([^/?]+)$/.exec(route)
    if (repositoryRoute) return repositories.get(repositoryRoute[1])
    const blockRoute = /^\/repositories\/([^/?]+)\/(settings|rules)$/.exec(route)
    if (blockRoute) {
      const [, repositoryId, part] = blockRoute
      return part === 'settings'
        ? repositorySettings.settings(repositoryId)
        : repositorySettings.rulesStatus(repositoryId)
    }
    if (route === reviewPath(mockReview.id)) return runNow()
    if (route === reviewDiffPath(mockReview.id)) return structuredClone(mockDiff)
    if (route === reviewStepsPath(mockReview.id)) return stepsNow()
    throw new ApiError(404, `Нет такого ресурса: ${path}`, 'ROUTE_NOT_FOUND')
  }

  const post = (path: string, body: unknown): unknown => {
    if (path === '/repositories') return repositories.connect(body as ConnectRepositoryRequest)
    throw new ApiError(404, `Нет такого ресурса: ${path}`, 'ROUTE_NOT_FOUND')
  }

  const put = (path: string, body: unknown): unknown => {
    const settingsRoute = /^\/repositories\/([^/?]+)\/settings$/.exec(path)
    if (settingsRoute) {
      return repositorySettings.saveSettings(settingsRoute[1], body as RepositorySettingsUpdate)
    }
    throw new ApiError(404, `Нет такого ресурса: ${path}`, 'ROUTE_NOT_FOUND')
  }

  const del = (path: string): unknown => {
    const repositoryRoute = /^\/repositories\/([^/?]+)$/.exec(path)
    if (repositoryRoute) return repositories.disconnect(repositoryRoute[1])
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
    put: (path, body) => respond(() => put(path, body)),
    delete: (path) => respond(() => del(path)),
  }
}
