import type { EventStream, EventStreamHandlers, StreamState } from '../shared/api'

/**
 * Источник событий, которым тест управляет вручную: ничего не приходит само, пока тест не
 * вызвал `emit` или `setState`. Заменяет `EventSource` за интерфейсом `EventStream`.
 */
export type FakeEventStream = EventStream & {
  /** Пути всех подписок по порядку открытия. */
  opened: string[]
  /** Сколько подписок открыто сейчас. */
  active: () => number
  emit: (type: string, data: unknown) => void
  /** Отдаёт событие `status` в форме контракта; незаданные поля — `null`. */
  emitStatus: (event: Record<string, unknown> & { status: string }) => void
  setState: (state: StreamState) => void
}

export function createFakeEventStream(): FakeEventStream {
  const handlers = new Set<EventStreamHandlers>()
  const opened: string[] = []

  return {
    opened,
    subscribe(path, subscriber) {
      opened.push(path)
      handlers.add(subscriber)
      return () => {
        handlers.delete(subscriber)
      }
    },
    active: () => handlers.size,
    emit: (type, data) => handlers.forEach((subscriber) => subscriber.onEvent(type, data)),
    emitStatus: (event) =>
      handlers.forEach((subscriber) =>
        subscriber.onEvent('status', {
          review_run_id: 'run-1',
          last_progress_at: null,
          failed_stage: null,
          failure_reason: null,
          ...event,
        }),
      ),
    setState: (state) => handlers.forEach((subscriber) => subscriber.onStateChange(state)),
  }
}
