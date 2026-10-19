import { describe, expect, it } from 'vitest'

import { makeFinding, makePublishedComment, makeReviewRun } from '../../../test/factories'
import { ReviewExtrasSchema, ReviewRunResponseSchema } from './review'

describe('ReviewRunResponseSchema', () => {
  it('принимает ответ GET /reviews/{id} с замечаниями и публикациями', () => {
    const response = {
      ...makeReviewRun(),
      findings: [makeFinding()],
      published_comments: [makePublishedComment({ kind: 'thread_reply' })],
    }
    expect(ReviewRunResponseSchema.safeParse(response).success).toBe(true)
  })

  it('отвергает ответ без опубликованных комментариев', () => {
    const response = { ...makeReviewRun(), findings: [] }
    expect(ReviewRunResponseSchema.safeParse(response).success).toBe(false)
  })
})

describe('ReviewExtrasSchema', () => {
  const extras = { verdict: null, score: null, files: [], diffs_by_path: {}, actions: [] }

  it('до завершения вердикта и оценки нет', () => {
    expect(ReviewExtrasSchema.safeParse(extras).success).toBe(true)
  })

  it('оценка вне 0–100 не проходит', () => {
    const outOfRange = { ...extras, verdict: 'approve', score: 140 }
    expect(ReviewExtrasSchema.safeParse(outOfRange).success).toBe(false)
  })
})
