import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  describeEventStreamContract,
  type EventStreamHarness,
} from '../../test/eventStreamContract'
import { createEventSourceStream, SILENCE_LIMIT, type StreamState } from './eventStream'

/** Минимальная подмена браузерного `EventSource`: тест сам «шлёт» события сервера. */
class FakeEventSource {
  static CLOSED = 2
  static instances: FakeEventSource[] = []

  readyState = 0
  closed = false
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  private listeners = new Map<string, (event: { data: string }) => void>()

  constructor(
    readonly url: string,
    readonly init: { withCredentials: boolean },
  ) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (event: { data: string }) => void) {
    this.listeners.set(type, listener)
  }

  close() {
    this.closed = true
  }

  /** Закрытое соединение событий не доставляет, как настоящее. */
  send(type: string, data = '{}') {
    if (this.closed) return
    this.listeners.get(type)?.({ data })
  }

  /** Событие, уже стоявшее в очереди браузера к моменту `close()`: до слушателя оно доходит. */
  sendLate(type: string, data = '{}') {
    this.listeners.get(type)?.({ data })
  }
}

const EVENTS = '/api/v1/events'
const EVENT_TYPES = ['run.status_changed', 'run.finished'] as const

function eventSourceHarness(): EventStreamHarness {
  FakeEventSource.instances = []
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.useFakeTimers()
  return {
    stream: createEventSourceStream({ eventTypes: EVENT_TYPES }),
    path: EVENTS,
    serverConnects: () => {
      FakeEventSource.instances[0].onopen?.()
    },
    serverSendsRunEvent: () => {
      const source = FakeEventSource.instances[0]
      source.send('run.status_changed', JSON.stringify({ id: 'run-7', status: 'queued' }))
    },
    serverKeepsTalking: () => {
      const source = FakeEventSource.instances[0]
      source.send('run.status_changed', JSON.stringify({ id: 'run-7', status: 'analysing' }))
      vi.advanceTimersByTime(SILENCE_LIMIT * 2)
    },
    isClosed: () =>
      FakeEventSource.instances.every((source) => source.closed) && vi.getTimerCount() === 0,
    dispose: () => {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    },
  }
}

describeEventStreamContract('EventSource', eventSourceHarness)

describe('createEventSourceStream', () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function open() {
    const states: StreamState[] = []
    const events: [string, unknown][] = []
    const unsubscribe = createEventSourceStream({ eventTypes: EVENT_TYPES }).subscribe(EVENTS, {
      onEvent: (type, data) => events.push([type, data]),
      onStateChange: (state) => states.push(state),
    })
    return { source: FakeEventSource.instances[0], states, events, unsubscribe }
  }

  it('подключается с cookie сессии', () => {
    const { source, states } = open()

    expect(source.url).toBe('/api/v1/events')
    expect(source.init).toEqual({ withCredentials: true })
    expect(states).toEqual(['connecting'])
  })

  it('отдаёт разобранный JSON события, а не JSON — строкой', () => {
    const { source, events } = open()

    source.send('run.status_changed', '{"status":"analysing"}')
    source.send('run.finished', 'не json')

    expect(events).toEqual([
      ['run.status_changed', { status: 'analysing' }],
      ['run.finished', 'не json'],
    ])
  })

  it('события типов вне списка до подписчика не доходят', () => {
    const { source, events } = open()

    source.send('repository.synced', '{"id":"repo-1"}')

    expect(events).toEqual([])
  })

  it('сообщает open на каждое соединение, в том числе после переподключения браузера', () => {
    const { source, states } = open()

    source.onopen?.()
    source.onerror?.()
    source.onopen?.()

    expect(states).toEqual(['connecting', 'open', 'reconnecting', 'open'])
  })

  it('различает обрыв с переподключением и отказ сервера', () => {
    const { source, states } = open()

    source.onopen?.()
    source.onerror?.()
    source.readyState = FakeEventSource.CLOSED
    source.onerror?.()

    expect(states).toEqual(['connecting', 'open', 'reconnecting', 'failed'])
  })

  it('отписка закрывает соединение', () => {
    const { source, unsubscribe } = open()

    unsubscribe()

    expect(source.closed).toBe(true)
  })

  describe('таймаут heartbeat', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('после 45 секунд тишины закрывает соединение и открывает новое', () => {
      const { source, states } = open()
      source.onopen?.()

      vi.advanceTimersByTime(SILENCE_LIMIT - 1)
      expect(FakeEventSource.instances).toHaveLength(1)
      vi.advanceTimersByTime(1)

      expect(source.closed).toBe(true)
      expect(FakeEventSource.instances).toHaveLength(2)
      expect(states).toEqual(['connecting', 'open', 'reconnecting'])
    })

    it('первое событие нового соединения доходит до подписчика', () => {
      const { events } = open()
      vi.advanceTimersByTime(SILENCE_LIMIT)

      FakeEventSource.instances[1].send('run.status_changed', '{"status":"analysing"}')

      expect(events).toEqual([['run.status_changed', { status: 'analysing' }]])
    })

    it('события старого соединения после переоткрытия не доходят и не двигают таймер', () => {
      const { source, events } = open()
      vi.advanceTimersByTime(SILENCE_LIMIT)
      expect(FakeEventSource.instances).toHaveLength(2)

      vi.advanceTimersByTime(5_000)
      source.sendLate('run.status_changed', '{"status":"publishing"}')
      source.sendLate('ping')

      expect(events).toEqual([])
      vi.advanceTimersByTime(SILENCE_LIMIT - 5_000)
      expect(FakeEventSource.instances).toHaveLength(3)
    })

    it('ping каждые 15 секунд не даёт переоткрыть соединение и не доходит до подписчика', () => {
      const { source, events } = open()

      for (let i = 0; i < 10; i += 1) {
        vi.advanceTimersByTime(15_000)
        source.send('ping')
      }

      expect(FakeEventSource.instances).toHaveLength(1)
      expect(source.closed).toBe(false)
      expect(events).toEqual([])
    })

    it('событие прогона тоже сбрасывает таймер', () => {
      const { source } = open()

      vi.advanceTimersByTime(SILENCE_LIMIT - 1)
      source.send('run.status_changed', '{"status":"analysing"}')
      vi.advanceTimersByTime(SILENCE_LIMIT - 1)

      expect(FakeEventSource.instances).toHaveLength(1)
    })

    it('отписка чистит таймер: после неё ничего не переоткрывается', () => {
      const { unsubscribe } = open()

      unsubscribe()
      vi.advanceTimersByTime(SILENCE_LIMIT * 3)

      expect(FakeEventSource.instances).toHaveLength(1)
      expect(vi.getTimerCount()).toBe(0)
    })

    it('отказ сервера останавливает таймер', () => {
      const { source } = open()

      source.readyState = FakeEventSource.CLOSED
      source.onerror?.()
      vi.advanceTimersByTime(SILENCE_LIMIT * 2)

      expect(FakeEventSource.instances).toHaveLength(1)
    })
  })
})
