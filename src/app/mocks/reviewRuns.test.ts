import { describe, expect, it } from 'vitest'

import { ReviewRunListResponseSchema } from '../../entities/review-run'
import { mockRepositoryId } from './repositories'
import { createReviewRunStore } from './reviewRuns'

const store = createReviewRunStore()
const list = (search: string) => ReviewRunListResponseSchema.parse(store.list(search))

describe('createReviewRunStore', () => {
  it('около тридцати прогонов по контракту, сначала новые, постранично', () => {
    const first = list('limit=10&offset=0')
    expect(first.total).toBe(29)
    expect(first.items).toHaveLength(10)
    expect(first.items[0].id).toBe('run-42')
    const created = first.items.map((run) => Date.parse(run.created_at))
    expect(created).toEqual([...created].sort((a, b) => b - a))
    expect(list('limit=10&offset=20').items).toHaveLength(9)
  })

  it('фильтры складываются через «и»', () => {
    const page = list(
      `status=failed&status=completed&active=false&repository_id=${mockRepositoryId(2)}`,
    )
    expect(page.items.length).toBeGreaterThan(0)
    for (const run of page.items) {
      expect(['failed', 'completed']).toContain(run.status)
      expect(run.merge_request.repository.id).toBe(mockRepositoryId(2))
    }
    expect(list('active=true&status=completed').total).toBe(0)
  })

  it('q — номер PR, подстрока заголовка или автора; author — точное совпадение', () => {
    expect(list('q=%2342').items.map((run) => run.id)).toEqual(['run-42'])
    expect(
      list('q=ВАЛИДАЦИЯ').items.every((run) => run.merge_request.title.includes('Валидация')),
    ).toBe(true)
    expect(
      list('author=i.sidorov').items.every((run) => run.merge_request.author === 'i.sidorov'),
    ).toBe(true)
  })

  it('период: начало включительно, конец исключительно; начало позже конца — 422', () => {
    const page = list('created_from=2026-09-26T00:00:00Z&created_to=2026-09-27T00:00:00Z')
    expect(page.items.every((run) => run.created_at.startsWith('2026-09-26'))).toBe(true)
    expect(() => list('created_from=2026-09-27T00:00:00Z&created_to=2026-09-26T00:00:00Z')).toThrow(
      'created_from позже created_to',
    )
  })
})
