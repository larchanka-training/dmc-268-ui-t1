import { describe, expect, it } from 'vitest'

import { isTerminalStatus, ReviewRunSchema } from './schema'
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
