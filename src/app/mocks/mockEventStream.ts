import { isTerminalStatus } from '../../entities/review-run'
import type { EventStream } from '../../shared/api'
import { mockReview } from './fixtures'
import { createMockServer, type MockServer } from './mockServer'
import { FOREIGN_RUN_ID, scenarioRow } from './reviewRuns'

export { COMPLETED_SCENARIO, FAILED_SCENARIO } from './mockServer'
export { FOREIGN_RUN_ID } from './reviewRuns'

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

  const rowAt = (index: number, id: string) => scenarioRow(server, index, id)

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
