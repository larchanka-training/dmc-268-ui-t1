import { describe, expect, it } from 'vitest'

import {
  applyRunEvent,
  isRunEventType,
  isTerminalStatus,
  ReviewRunListItemSchema,
  ReviewRunSchema,
} from './schema'
import { makeReviewRun, makeRunListItem } from '../../../test/factories'

describe('ReviewRunSchema', () => {
  it('принимает прогон по контракту', () => {
    expect(ReviewRunSchema.safeParse(makeReviewRun()).success).toBe(true)
  })

  it('принимает незнакомый статус, а не роняет страницу', () => {
    const run = makeReviewRun({ status: 'waiting_for_quota' })
    expect(ReviewRunSchema.safeParse(run).success).toBe(true)
  })

  it('отвергает DTO без обязательного поля', () => {
    const run: Partial<ReturnType<typeof makeReviewRun>> = makeReviewRun()
    delete run.head_sha
    expect(ReviewRunSchema.safeParse(run).success).toBe(false)
  })
})

describe('failed_stage', () => {
  it('принимает только этапы контракта', () => {
    expect(ReviewRunSchema.safeParse(makeReviewRun({ failed_stage: 'analysing' })).success).toBe(
      true,
    )
    const unknownStage = { ...makeReviewRun(), failed_stage: 'deploying' }
    expect(ReviewRunSchema.safeParse(unknownStage).success).toBe(false)
  })
})

describe('isTerminalStatus', () => {
  it.each(['completed', 'failed', 'cancelled'])('%s — терминальный', (status) => {
    expect(isTerminalStatus(status)).toBe(true)
  })

  it.each(['queued', 'building_context', 'analysing', 'publishing', 'waiting_for_quota'])(
    '%s — прогон ещё идёт',
    (status) => {
      expect(isTerminalStatus(status)).toBe(false)
    },
  )
})

describe('last_progress_at', () => {
  it('обязателен: бэкенд отдаёт его всегда', () => {
    const { last_progress_at, ...withoutProgress } = makeReviewRun()
    expect(last_progress_at).toBeTruthy()
    expect(ReviewRunSchema.safeParse(withoutProgress).success).toBe(false)
  })
})

describe('ReviewRunListItemSchema', () => {
  it('принимает строку прогона по контракту и незнакомый статус', () => {
    expect(ReviewRunListItemSchema.safeParse(makeRunListItem()).success).toBe(true)
    expect(
      ReviewRunListItemSchema.safeParse(makeRunListItem({ status: 'waiting_for_quota' })).success,
    ).toBe(true)
  })

  it('отвергает строку без status', () => {
    const { status, ...broken } = makeRunListItem()
    expect(status).toBe('analysing')
    expect(ReviewRunListItemSchema.safeParse(broken).success).toBe(false)
  })
})

describe('isRunEventType', () => {
  it.each(['run.created', 'run.status_changed', 'run.finished'])('%s — событие прогона', (type) => {
    expect(isRunEventType(type)).toBe(true)
  })

  it.each(['ping', 'status', 'repository.synced'])('%s — не событие прогона', (type) => {
    expect(isRunEventType(type)).toBe(false)
  })
})

describe('applyRunEvent', () => {
  it('меняет только поля статуса и прогресса', () => {
    const run = makeReviewRun({ status: 'analysing', tokens_used: 5, failure_reason: null })

    const next = applyRunEvent(
      run,
      makeRunListItem({ status: 'publishing', last_progress_at: '2026-09-20T14:09:00Z' }),
    )

    expect(next).toMatchObject({
      status: 'publishing',
      last_progress_at: '2026-09-20T14:09:00Z',
      updated_at: '2026-09-20T14:10:00Z',
      tokens_used: 5,
    })
    expect(next.id).toBe(run.id)
  })

  it('событие старше прогона проигрывает, равное по updated_at — применяется', () => {
    const run = makeReviewRun({ status: 'analysing', updated_at: '2026-09-20T14:07:14.5Z' })

    expect(
      applyRunEvent(run, makeRunListItem({ status: 'queued', updated_at: '2026-09-20T14:07:14Z' })),
    ).toBe(run)
    expect(
      applyRunEvent(
        run,
        makeRunListItem({ status: 'publishing', updated_at: '2026-09-20T14:07:14.500000Z' }),
      ).status,
    ).toBe('publishing')
  })
})
