import { describe, expect, it } from 'vitest'

import { reviewRunListPath } from './reviewRunListApi'

describe('reviewRunListPath', () => {
  it('массивы — повторяющимся параметром, пустые значения пропускаются', () => {
    const path = reviewRunListPath({
      status: ['queued', 'failed'],
      repository_id: ['repo-1', 'repo-2'],
      active: false,
      q: '',
      author: null,
      limit: 20,
      offset: 40,
    })
    expect(path).toBe(
      '/reviews?status=queued&status=failed&repository_id=repo-1&repository_id=repo-2&active=false&limit=20&offset=40',
    )
  })

  it('без параметров — голый путь', () => {
    expect(reviewRunListPath({})).toBe('/reviews')
  })
})
