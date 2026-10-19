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

// Тело ошибки бэкенда по RFC 9457 (`AnyProblem` контракта).
function problem(status: number, code: string, detail: string) {
  return {
    type: `urn:dmc-268:problem:${code.toLowerCase().split('_').join('-')}`,
    title: 'Ошибка',
    status,
    detail,
    instance: '/api/v1/x',
    code,
    trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
  }
}

describe('ApiError.code', () => {
  beforeEach(() => {
    vi.spyOn(navigation, 'assign').mockImplementation(() => {})
    window.history.pushState({}, '', '/app/')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('берёт code и detail из problem-тела', async () => {
    stubFetch({
      'GET /api/v1/x': { status: 403, body: problem(403, 'ORIGIN_FORBIDDEN', 'Чужой Origin.') },
    })

    await expect(apiFetch('/x')).rejects.toMatchObject({
      status: 403,
      code: 'ORIGIN_FORBIDDEN',
      message: 'Чужой Origin.',
    })
    expect(navigation.assign).not.toHaveBeenCalled()
  })

  it('401 несёт code и detail и уводит на /login', async () => {
    stubFetch({
      'GET /api/v1/x': {
        status: 401,
        body: problem(401, 'UNAUTHENTICATED', 'Нет действительной сессии.'),
      },
    })

    await expect(apiFetch('/x')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Нет действительной сессии.',
    })
    expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2F')
  })

  it('тело не по форме — code пустой, текст общий', async () => {
    stubFetch({ 'GET /api/v1/x': { status: 500 } })

    await expect(apiFetch('/x')).rejects.toMatchObject({
      status: 500,
      code: undefined,
      message: 'Запрос /x завершился ошибкой 500',
    })
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

  it('POST отправляет JSON-тело и отдаёт ответ как unknown', async () => {
    const calls = stubFetch({ 'POST /api/v1/repositories': { status: 201, body: { id: 'r-1' } } })

    await expect(
      createHttpTransport().post('/repositories', { provider: 'github', providerId: '1' }),
    ).resolves.toEqual({ id: 'r-1' })
    expect(calls[0].init.body).toBe('{"provider":"github","providerId":"1"}')
    expect(new Headers(calls[0].init.headers).get('Content-Type')).toBe('application/json')
    expect(calls[0].init.credentials).toBe('include')
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
