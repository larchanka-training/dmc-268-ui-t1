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
