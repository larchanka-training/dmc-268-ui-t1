import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiFetch, ApiError } from '@/shared/api'
import { navigation } from '@/shared/lib'
import { stubFetch } from '@/test/api'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.spyOn(navigation, 'assign').mockImplementation(() => {})
    window.history.pushState({}, '', '/app/repositories?tab=all')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('отправляет cookie сессии и не отправляет Authorization', async () => {
    const calls = stubFetch({ 'GET /api/v1/repositories': { status: 200, body: [] } })

    await apiFetch('/repositories')

    expect(calls[0].init.credentials).toBe('include')
    expect(new Headers(calls[0].init.headers).has('Authorization')).toBe(false)
  })

  it('на 401 уводит на /login с возвратом на текущий экран', async () => {
    stubFetch({ 'GET /api/v1/repositories': { status: 401 } })

    await expect(apiFetch('/repositories')).rejects.toMatchObject({ status: 401 })

    expect(navigation.assign).toHaveBeenCalledWith(
      '/login?redirect=%2Fapp%2Frepositories%3Ftab%3Dall',
    )
  })

  it('другую ошибку отдаёт как ApiError и никуда не уводит', async () => {
    stubFetch({ 'GET /api/v1/repositories': { status: 503 } })

    await expect(apiFetch('/repositories')).rejects.toBeInstanceOf(ApiError)
    expect(navigation.assign).not.toHaveBeenCalled()
  })
})
