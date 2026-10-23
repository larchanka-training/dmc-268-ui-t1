import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StreamState } from '../../shared/api'
import { describeEventStreamContract } from '../../test/eventStreamContract'
import {
  COMPLETED_SCENARIO,
  createScenarioEventStream,
  FAILED_SCENARIO,
  FOREIGN_RUN_ID,
  UNKNOWN_EVENT_TYPE,
} from './mockEventStream'
import { createMockServer } from './mockServer'
import { mockRepositoryId } from './repositories'

const EVENTS = '/api/v1/events'

describe('createScenarioEventStream', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function listen(stream = createScenarioEventStream(createMockServer({ stepMs: 1_000 }))) {
    const states: StreamState[] = []
    const events: { type: string; data: Record<string, unknown> }[] = []
    const unsubscribe = stream.subscribe(EVENTS, {
      onEvent: (type, data) => events.push({ type, data: data as Record<string, unknown> }),
      onStateChange: (state) => states.push(state),
    })
    /** События своего прогона `run-42`: `[тип, статус]`. */
    const own = () =>
      events
        .filter((event) => event.type.startsWith('run.') && event.data.id === 'run-42')
        .map((event) => [event.type, event.data.status])
    return { states, events, own, unsubscribe, stream }
  }

  it('подключение даёт только open, без снимка; переходы — run.status_changed и run.finished', () => {
    const { states, own } = listen()

    vi.advanceTimersByTime(0)
    expect(states).toEqual(['connecting', 'open'])
    expect(own()).toEqual([])

    vi.advanceTimersByTime(10_000)
    expect(own()).toEqual([
      ...COMPLETED_SCENARIO.slice(1, -1).map((step) => ['run.status_changed', step.status]),
      ['run.finished', 'completed'],
    ])
  })

  it('данные события — строка прогона с этапом сбоя', () => {
    const { events } = listen(
      createScenarioEventStream(createMockServer({ scenario: FAILED_SCENARIO, stepMs: 1_000 })),
    )

    vi.advanceTimersByTime(10_000)

    expect(events[events.length - 1]).toMatchObject({
      type: 'run.finished',
      data: { id: 'run-42', status: 'failed', failed_stage: 'analysing', findings_count: 0 },
    })
  })

  it('между переходами шлёт событие чужого прогона и событие незнакомого типа', () => {
    const { events } = listen()

    vi.advanceTimersByTime(500)

    expect(events.map((event) => [event.type, event.data.id])).toEqual([
      ['run.status_changed', FOREIGN_RUN_ID],
      [UNKNOWN_EVENT_TYPE, mockRepositoryId(1)],
    ])
  })

  it('новая подписка продолжает с текущего шага, а не с начала', () => {
    const first = listen()
    vi.advanceTimersByTime(2_500)
    first.unsubscribe()

    const second = listen(first.stream)
    vi.advanceTimersByTime(1_000)

    expect(second.own()).toEqual([['run.status_changed', 'publishing']])
  })

  it('после отписки события не приходят', () => {
    const { events, unsubscribe } = listen()
    vi.advanceTimersByTime(0)

    unsubscribe()
    vi.advanceTimersByTime(10_000)

    expect(events).toEqual([])
  })
})

describeEventStreamContract('сценарий по таймеру', () => {
  vi.useFakeTimers()
  return {
    stream: createScenarioEventStream(createMockServer({ stepMs: 1_000 })),
    path: EVENTS,
    serverConnects: () => {
      vi.advanceTimersByTime(0)
    },
    serverSendsRunEvent: () => {
      vi.advanceTimersByTime(1_000)
    },
    serverKeepsTalking: () => {
      vi.advanceTimersByTime(10_000)
    },
    isClosed: () => vi.getTimerCount() === 0,
    dispose: () => vi.useRealTimers(),
  }
})
