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

describe('ответ бэкенда', () => {
  // Форма ReviewRunResponse из GET /api/v1/reviews/{id} (dmc-268-api-t1#36).
  const backendRun = {
    id: '0192f0c4-7a1e-7b3c-9d2e-4f5a6b7c8d9e',
    merge_request_id: '0192f0c4-7a1e-7b3c-9d2e-000000000042',
    head_sha: '9f3c2a17e4b8d6c0a5f1',
    base_sha: '2b7e41d09c3a8f6e1d24',
    status: 'completed',
    trigger: 'webhook',
    model: 'claude-sonnet-5',
    tokens_used: 48213,
    duration_seconds: 134.2,
    failure_reason: null,
    created_at: '2026-10-05T17:03:26Z',
    updated_at: '2026-10-05T17:05:40Z',
    findings: [],
  }

  it('принимается без полей, которых бэкенд не отдаёт', () => {
    const result = ReviewRunSchema.safeParse(backendRun)

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({
      rejected_findings: null,
      change_request: null,
      merge_request: null,
      verdict: null,
      score: null,
    })
  })
})

describe('итог ревью', () => {
  it('до завершения вердикта и оценки нет', () => {
    const run = makeReviewRun({ status: 'analysing', verdict: null, score: null })
    expect(ReviewRunSchema.safeParse(run).success).toBe(true)
  })

  it('оценка вне 0–100 не проходит контракт', () => {
    expect(ReviewRunSchema.safeParse(makeReviewRun({ score: 140 })).success).toBe(false)
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

describe('last_progress_at и failed_stage', () => {
  it('ответ без этих полей разбирается, поля становятся null', () => {
    const { last_progress_at, failed_stage, ...legacy } = makeReviewRun()
    expect(last_progress_at).toBeNull()
    expect(failed_stage).toBeNull()

    const parsed = ReviewRunSchema.parse(legacy)

    expect(parsed.last_progress_at).toBeNull()
    expect(parsed.failed_stage).toBeNull()
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
