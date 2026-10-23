import { describe, expect, it } from 'vitest'

import type { EventStream, StreamState } from '../shared/api'

/**
 * Реализация `EventStream` в руках теста: общий набор сценариев не знает, EventSource это
 * или сценарий по таймеру, и управляет сервером только через эти методы.
 */
export type EventStreamHarness = {
  stream: EventStream
  path: string
  /** Соединение открылось. */
  serverConnects: () => void
  /** Сервер шлёт `run.status_changed` с данными прогона. */
  serverSendsRunEvent: () => void
  /** Проходит время, сервер продолжает слать события. */
  serverKeepsTalking: () => void
  /** Соединение закрыто и ничего не ждёт: ни сокета, ни таймеров. */
  isClosed: () => boolean
  dispose: () => void
}

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

      harness.serverSendsRunEvent()
      expect(events).toContainEqual([
        'run.status_changed',
        expect.objectContaining({ id: expect.any(String), status: expect.any(String) }),
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
