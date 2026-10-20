import { describe, expect, it } from 'vitest'

import { MOCK_USER, mockAuthReply } from './mockAuth'

describe('mockAuthReply', () => {
  it('с cookie session отдаёт профиль', () => {
    const reply = mockAuthReply('GET', '/api/v1/auth/me', 'theme=dark; session=dev')

    expect(reply?.status).toBe(200)
    expect(JSON.parse(reply?.body ?? '')).toEqual(MOCK_USER)
  })

  it.each([undefined, '', 'theme=dark', 'session='])('без сессии (%s) — 401', (cookie) => {
    expect(mockAuthReply('GET', '/api/v1/auth/me', cookie)?.status).toBe(401)
  })

  it('401 отдаёт problem+json по контракту', () => {
    const reply = mockAuthReply('GET', '/api/v1/auth/me?x=1', undefined)
    const problem = JSON.parse(reply?.body ?? '') as Record<string, unknown>

    expect(reply?.headers['Content-Type']).toBe('application/problem+json')
    expect(problem).toMatchObject({
      type: 'urn:dmc-268:problem:unauthenticated',
      title: 'Требуется вход',
      status: 401,
      instance: '/api/v1/auth/me',
      code: 'UNAUTHENTICATED',
    })
    expect(problem.detail).toEqual(expect.any(String))
    expect(problem.trace_id).toMatch(/^[0-9a-f]{32}$/)
    expect(reply?.headers['X-Trace-ID']).toBe(problem.trace_id)
  })

  it('выход отвечает 204 и удаляет cookie', () => {
    const reply = mockAuthReply('POST', '/api/v1/auth/logout', 'session=dev')

    expect(reply?.status).toBe(204)
    expect(reply?.headers['Set-Cookie']).toBe('session=; Path=/; Max-Age=0')
  })

  it('остальные запросы не трогает', () => {
    expect(mockAuthReply('GET', '/api/v1/repositories', 'session=dev')).toBeNull()
    expect(mockAuthReply('POST', '/api/v1/auth/me', 'session=dev')).toBeNull()
  })
})
