import { describe, expect, it } from 'vitest'

import { makeFinding, makePublishedComment, makeReviewRun } from '../../../test/factories'
import { canRequestDiff, ReviewRunResponseSchema } from './review'

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

describe('canRequestDiff', () => {
  it.each([
    ['есть base_sha, дифф не удалён', 'a1c2e3f4', null, true],
    ['нет base_sha', null, null, false],
    ['дифф удалён по сроку хранения', 'a1c2e3f4', '2026-10-21T03:00:00Z', false],
    ['нет base_sha и дифф удалён', null, '2026-10-21T03:00:00Z', false],
  ])('%s', (_, base_sha, diff_expired_at, expected) => {
    expect(canRequestDiff(makeReviewRun({ base_sha, diff_expired_at }))).toBe(expected)
  })
})
