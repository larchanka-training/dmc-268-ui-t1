import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StreamState } from '../../shared/api'
import { CONTRACT_RUN_ID, describeEventStreamContract } from '../../test/eventStreamContract'
import { COMPLETED_SCENARIO, createScenarioEventStream, FAILED_SCENARIO } from './mockEventStream'
import { createMockServer } from './mockServer'

describe('createScenarioEventStream', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function listen(stream = createScenarioEventStream(createMockServer({ stepMs: 1_000 }))) {
    const statuses: string[] = []
    const states: StreamState[] = []
    const events: Record<string, unknown>[] = []
    const unsubscribe = stream.subscribe('/api/v1/reviews/run-7/events', {
      onEvent: (_type, data) => {
        const event = data as Record<string, unknown>
        events.push(event)
        statuses.push(String(event.status))
      },
      onStateChange: (state) => states.push(state),
    })
    return { statuses, states, events, unsubscribe, stream }
  }

  it('проигрывает сценарий по таймеру, начиная со снимка', () => {
    const { statuses, states } = listen()

    vi.advanceTimersByTime(0)
    expect(statuses).toEqual(['queued'])
    expect(states).toEqual(['connecting', 'open'])

    vi.advanceTimersByTime(10_000)
    expect(statuses).toEqual(COMPLETED_SCENARIO.map((step) => step.status))
  })

  it('событие несёт id прогона из пути и поля сбоя', () => {
    const { events } = listen(
      createScenarioEventStream(createMockServer({ scenario: FAILED_SCENARIO, stepMs: 1_000 })),
    )

    vi.advanceTimersByTime(10_000)

    expect(events[events.length - 1]).toMatchObject({
      review_run_id: 'run-7',
      status: 'failed',
      failed_stage: 'analysing',
    })
  })

  it('новая подписка начинается со снимка текущего шага, а не с начала', () => {
    const first = listen()
    vi.advanceTimersByTime(2_500)
    first.unsubscribe()

    const second = listen(first.stream)
    vi.advanceTimersByTime(0)

    expect(second.statuses).toEqual(['analysing'])
  })

  it('после отписки события не приходят', () => {
    const { statuses, unsubscribe } = listen()
    vi.advanceTimersByTime(0)

    unsubscribe()
    vi.advanceTimersByTime(10_000)

    expect(statuses).toEqual(['queued'])
  })
})

describeEventStreamContract('сценарий по таймеру', () => {
  vi.useFakeTimers()
  return {
    stream: createScenarioEventStream(createMockServer({ stepMs: 1_000 })),
    path: `/api/v1/reviews/${CONTRACT_RUN_ID}/events`,
    serverConnects: () => {
      vi.advanceTimersByTime(0)
    },
    serverKeepsTalking: () => {
      vi.advanceTimersByTime(10_000)
    },
    isClosed: () => vi.getTimerCount() === 0,
    dispose: () => vi.useRealTimers(),
  }
})
