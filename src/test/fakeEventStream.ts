import type { ReviewRunListItem } from '../entities/review-run'
import type { EventStream, EventStreamHandlers, StreamState } from '../shared/api'
import { makeRunListItem } from './factories'

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
  /**
   * Отдаёт событие прогона `run-1` в форме `ReviewRunListItem`; по умолчанию —
   * `run.status_changed`, незаданные поля — как у `makeRunListItem`.
   */
  emitRun: (event: Partial<ReviewRunListItem> & { status: string }, type?: string) => void
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
    emitRun: (event, type = 'run.status_changed') =>
      handlers.forEach((subscriber) => subscriber.onEvent(type, makeRunListItem(event))),
    setState: (state) => handlers.forEach((subscriber) => subscriber.onStateChange(state)),
  }
}
