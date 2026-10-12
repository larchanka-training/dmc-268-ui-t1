import { describe, expect, it } from 'vitest'

import type { EventStream, StreamState } from '../shared/api'

/**
 * Реализация `EventStream` в руках теста: общий набор сценариев не знает, EventSource это
 * или сценарий по таймеру, и управляет сервером только через эти методы.
 */
export type EventStreamHarness = {
  stream: EventStream
  path: string
  /** Соединение открылось, пришёл снимок: `{ review_run_id: 'run-7', status: 'queued' }`. */
  serverConnects: () => void
  /** Проходит время, сервер продолжает слать события. */
  serverKeepsTalking: () => void
  /** Соединение закрыто и ничего не ждёт: ни сокета, ни таймеров. */
  isClosed: () => boolean
  dispose: () => void
}

export const CONTRACT_RUN_ID = 'run-7'

/** Общий контракт `EventStream`: то, что обязана делать любая реализация. */
export function describeEventStreamContract(name: string, makeHarness: () => EventStreamHarness) {
  describe(`контракт EventStream: ${name}`, () => {
    function listen() {
      const harness = makeHarness()
      const states: StreamState[] = []
      const events: [string, unknown][] = []
      const unsubscribe = harness.stream.subscribe(harness.path, {
        onEvent: (type, data) => events.push([type, data]),
        onStateChange: (state) => states.push(state),
      })
      return { harness, states, events, unsubscribe }
    }

    it('сообщает connecting сразу при подписке, до ответа сервера', () => {
      const { harness, states, events } = listen()

      expect(states).toEqual(['connecting'])
      expect(events).toEqual([])
      harness.dispose()
    })

    it('после ответа сервера состояние open, а событие доходит до onEvent разобранным', () => {
      const { harness, states, events } = listen()

      harness.serverConnects()

      expect(states).toEqual(['connecting', 'open'])
      expect(events).toEqual([
        ['status', expect.objectContaining({ review_run_id: CONTRACT_RUN_ID, status: 'queued' })],
      ])
      harness.dispose()
    })

    it('отписка закрывает соединение, и обработчики больше не зовутся', () => {
      const { harness, states, events, unsubscribe } = listen()
      harness.serverConnects()
      const statesBefore = [...states]
      const eventsBefore = [...events]

      unsubscribe()
      harness.serverKeepsTalking()

      expect(harness.isClosed()).toBe(true)
      expect(states).toEqual(statesBefore)
      expect(events).toEqual(eventsBefore)
      harness.dispose()
    })
  })
}
