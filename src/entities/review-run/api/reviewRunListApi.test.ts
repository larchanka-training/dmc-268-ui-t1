import { describe, expect, it } from 'vitest'

import { reviewRunListPath } from './reviewRunListApi'

const REPO_1 = '00000000-0000-4000-8000-000000000001'
const REPO_2 = '00000000-0000-4000-8000-000000000002'

describe('reviewRunListPath', () => {
  it('массивы — повторяющимся параметром, пустые значения пропускаются', () => {
    const path = reviewRunListPath({
      status: ['queued', 'failed'],
      repository_id: [REPO_1, REPO_2],
      active: false,
      q: '',
      author: null,
      limit: 20,
      offset: 40,
    })
    expect(path).toBe(
      `/reviews?status=queued&status=failed&repository_id=${REPO_1}&repository_id=${REPO_2}` +
        '&active=false&limit=20&offset=40',
    )
  })

  it('без параметров — голый путь', () => {
    expect(reviewRunListPath({})).toBe('/reviews')
  })
})
