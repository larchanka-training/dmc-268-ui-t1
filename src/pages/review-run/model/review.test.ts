import { describe, expect, it } from 'vitest'

import { makeFinding, makePublishedComment, makeReviewRun } from '../../../test/factories'
import { ReviewRunResponseSchema } from './review'

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
