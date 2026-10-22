import { isTerminalStatus, type ReviewRunListItem } from '../../entities/review-run'
import type { EventStream } from '../../shared/api'
import { mockReview } from './fixtures'
import { createMockServer, type MockServer } from './mockServer'

export { COMPLETED_SCENARIO, FAILED_SCENARIO } from './mockServer'

/** Чужой прогон в общем потоке: его события экран прогона `run-42` должен пропускать. */
export const FOREIGN_RUN_ID = 'run-7'

/** Тип события, которого клиент не знает: контракт велит его пропускать. */
export const UNKNOWN_EVENT_TYPE = 'repository.synced'

/**
 * Mock общего потока `GET /api/v1/events` за интерфейсом `EventStream`: проигрывает сценарий
 * прогона из фикстуры по таймеру. Как у настоящего сервера, истории нет: подключение даёт только
 * `open`, снимок клиент берёт сам. Переходы сценария приходят как `run.status_changed`, итоговый —
 * как `run.finished`. Посреди каждого шага поток шлёт событие чужого прогона и событие
 * незнакомого типа, чтобы фильтр экрана был виден и в dev. Состояние берёт у `MockServer`;
 * чтобы adapter видел те же шаги, передайте им один сервер.
 */
export function createScenarioEventStream(server: MockServer = createMockServer()): EventStream {
  const { scenario } = server

  const rowAt = (index: number, id: string): ReviewRunListItem => {
    const step = scenario[index]
    const at = new Date(server.enteredAt(index)).toISOString()
    const terminal = isTerminalStatus(step.status)
    return {
      id,
      status: step.status,
      trigger: mockReview.trigger,
      head_sha: mockReview.head_sha,
      created_at: mockReview.created_at,
      updated_at: at,
      last_progress_at: at,
      duration_seconds: terminal ? mockReview.duration_seconds : null,
      failed_stage: step.failed_stage ?? null,
      findings_count: step.status === 'completed' ? mockReview.findings.length : 0,
      merge_request: mockReview.merge_request,
    }
  }

  return {
    subscribe(_path, { onEvent, onStateChange }) {
      const first = server.currentIndex()
      const timers: ReturnType<typeof setTimeout>[] = []
      const at = (moment: number, emit: () => void) =>
        timers.push(setTimeout(emit, Math.max(moment - Date.now(), 0)))

      onStateChange('connecting')
      timers.push(setTimeout(() => onStateChange('open'), 0))
      for (let index = first; index < scenario.length; index += 1) {
        if (index > first) {
          const type = isTerminalStatus(scenario[index].status)
            ? 'run.finished'
            : 'run.status_changed'
          at(server.enteredAt(index), () => onEvent(type, rowAt(index, mockReview.id)))
        }
        if (index < scenario.length - 1) {
          const middle = server.enteredAt(index) + server.stepMs / 2
          at(middle, () => {
            onEvent('run.status_changed', rowAt(index + 1, FOREIGN_RUN_ID))
            onEvent(UNKNOWN_EVENT_TYPE, { id: mockReview.merge_request.repository.id })
          })
        }
      }

      return () => timers.forEach(clearTimeout)
    },
  }
}
