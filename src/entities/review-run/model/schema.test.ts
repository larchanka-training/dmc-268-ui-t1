import { describe, expect, it } from 'vitest'

import { applyStatusEvent, isTerminalStatus, ReviewRunSchema, RunStatusEventSchema } from './schema'
import { makeReviewRun } from '../../../test/factories'

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

describe('RunStatusEventSchema', () => {
  const event = {
    review_run_id: 'run-1',
    status: 'analysing',
    last_progress_at: '2026-10-11T10:00:00Z',
    failed_stage: null,
    failure_reason: null,
  }

  it('принимает событие по контракту и незнакомый статус', () => {
    expect(RunStatusEventSchema.safeParse(event).success).toBe(true)
    expect(RunStatusEventSchema.safeParse({ ...event, status: 'waiting_for_quota' }).success).toBe(
      true,
    )
  })

  it('отвергает событие без status', () => {
    const { status, ...broken } = event
    expect(status).toBe('analysing')
    expect(RunStatusEventSchema.safeParse(broken).success).toBe(false)
  })

  it('applyStatusEvent меняет только поля статуса', () => {
    const run = makeReviewRun({ status: 'analysing', tokens_used: 5 })

    const next = applyStatusEvent(
      run,
      RunStatusEventSchema.parse({ ...event, status: 'failed', failed_stage: 'analysing' }),
    )

    expect(next).toMatchObject({ status: 'failed', failed_stage: 'analysing', tokens_used: 5 })
    expect(next.id).toBe(run.id)
  })
})
