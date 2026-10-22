import { describe, expect, it } from 'vitest'

import { MAX_REPOSITORIES, parseFilters, writeFilters } from './filters'

const repoId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ids = (count: number) => Array.from({ length: count }, (_, n) => repoId(n + 1))

describe('repository_id', () => {
  it('из URL берутся только uuid, без повторов', () => {
    const params = new URLSearchParams()
    for (const id of ['foo', 'repo-1', '', repoId(1), repoId(1), repoId(2).toUpperCase()]) {
      params.append('repository_id', id)
    }
    expect(parseFilters(params).repositoryIds).toEqual([repoId(1), repoId(2).toUpperCase()])
  })

  it('из URL — не больше лимита контракта', () => {
    const params = new URLSearchParams(ids(51).map((id) => ['repository_id', id]))
    expect(parseFilters(params).repositoryIds).toEqual(ids(MAX_REPOSITORIES))
  })

  it('в URL пишется не больше лимита контракта', () => {
    const next = writeFilters(new URLSearchParams(), { repositoryIds: ids(51) })
    expect(next.getAll('repository_id')).toEqual(ids(MAX_REPOSITORIES))
  })
})
