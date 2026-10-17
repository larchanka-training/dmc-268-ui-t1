import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiFetch, ApiError, createHttpTransport } from '@/shared/api'
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

  it('с redirectOn401: false на 401 бросает ApiError и никуда не уводит', async () => {
    stubFetch({ 'POST /api/v1/auth/logout': { status: 401 } })

    await expect(
      apiFetch('/auth/logout', { method: 'POST' }, { redirectOn401: false }),
    ).rejects.toMatchObject({ status: 401 })
    expect(navigation.assign).not.toHaveBeenCalled()
  })
})

describe('ApiError.code', () => {
  beforeEach(() => {
    vi.spyOn(navigation, 'assign').mockImplementation(() => {})
    window.history.pushState({}, '', '/app/')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('берёт code из тела ошибки', async () => {
    stubFetch({
      'GET /api/v1/x': { status: 403, body: { code: 'ORIGIN_FORBIDDEN', message: 'нельзя' } },
    })

    await expect(apiFetch('/x')).rejects.toMatchObject({ status: 403, code: 'ORIGIN_FORBIDDEN' })
    expect(navigation.assign).not.toHaveBeenCalled()
  })

  it('401 несёт code и уводит на /login', async () => {
    stubFetch({
      'GET /api/v1/x': { status: 401, body: { code: 'UNAUTHENTICATED', message: 'вход' } },
    })

    await expect(apiFetch('/x')).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
    expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2F')
  })

  it('тело не по форме — code пустой', async () => {
    stubFetch({ 'GET /api/v1/x': { status: 500 } })

    await expect(apiFetch('/x')).rejects.toMatchObject({ status: 500, code: undefined })
  })
})

describe('createHttpTransport', () => {
  beforeEach(() => {
    vi.spyOn(navigation, 'assign').mockImplementation(() => {})
    window.history.pushState({}, '', '/app/repositories')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('GET идёт через apiFetch с cookie и отдаёт тело как unknown', async () => {
    const calls = stubFetch({ 'GET /api/v1/repositories': { status: 200, body: [{ id: 1 }] } })

    await expect(createHttpTransport().get('/repositories')).resolves.toEqual([{ id: 1 }])
    expect(calls[0].init.credentials).toBe('include')
  })

  it('401 уводит на /login', async () => {
    stubFetch({ 'GET /api/v1/repositories': { status: 401 } })

    await expect(createHttpTransport().get('/repositories')).rejects.toMatchObject({ status: 401 })
    expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2Frepositories')
  })
})
