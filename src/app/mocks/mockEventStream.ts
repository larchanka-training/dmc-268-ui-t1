import type { EventStream } from '../../shared/api'
import { createMockServer, type MockServer } from './mockServer'

export { COMPLETED_SCENARIO, FAILED_SCENARIO } from './mockServer'

/**
 * Mock-источник событий за интерфейсом `EventStream`: проигрывает сценарий статусов по
 * таймеру. Каждое подключение начинается со снимка текущего шага, как у настоящего сервера.
 * Состояние берёт у `MockServer`; чтобы adapter видел те же шаги, передайте им один сервер.
 */
export function createScenarioEventStream(server: MockServer = createMockServer()): EventStream {
  const { scenario } = server

  const eventAt = (index: number, runId: string) => {
    const step = scenario[index]
    return {
      review_run_id: runId,
      status: step.status,
      last_progress_at: new Date(server.enteredAt(index)).toISOString(),
      failed_stage: step.failed_stage ?? null,
      failure_reason: step.failure_reason ?? null,
    }
  }

  return {
    subscribe(path, { onEvent, onStateChange }) {
      // `/api/v1/reviews/{id}/events` → `{id}`
      const segments = path.split('/')
      const runId = segments[segments.length - 2] ?? ''
      const first = server.currentIndex()
      const timers: ReturnType<typeof setTimeout>[] = []

      onStateChange('connecting')
      timers.push(
        setTimeout(() => {
          onStateChange('open')
          onEvent('status', eventAt(first, runId))
        }, 0),
      )
      for (let index = first + 1; index < scenario.length; index += 1) {
        const delay = Math.max(server.enteredAt(index) - Date.now(), 0)
        timers.push(setTimeout(() => onEvent('status', eventAt(index, runId)), delay))
      }

      return () => timers.forEach(clearTimeout)
    },
  }
}
