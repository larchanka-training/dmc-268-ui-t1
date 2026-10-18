/**
 * Мок `/api/v1/auth/*` для dev-сервера. Ведёт себя как бэкенд (api#47) в той
 * части, которую видит кабинет: есть cookie `session` с любым значением —
 * вошёл, нет — `401`. Тем же правилом nginx пускает в `/app/`, поэтому
 * локально вход — cookie `session` в DevTools, как в README. Ошибка — как у
 * бэкенда, по RFC 9457: `application/problem+json`, тело `UnauthenticatedProblem`.
 */

import type { ApiSchemas } from '../shared/api/contract'

export type MockReply = { status: number; headers: Record<string, string>; body: string }

export const MOCK_USER: ApiSchemas['UserResponse'] = {
  provider: 'github',
  login: 'dev',
  name: 'Локальный пользователь',
  avatar_url: null,
}

const JSON_TYPE = { 'Content-Type': 'application/json' }

function randomTraceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Тело `401` по контракту; `trace_id` — 32 hex, как trace-id W3C Trace Context. */
function unauthenticatedProblem(instance: string): ApiSchemas['UnauthenticatedProblem'] {
  return {
    type: 'urn:dmc-268:problem:unauthenticated',
    title: 'Требуется вход',
    status: 401,
    detail: 'Нет действительной сессии.',
    instance,
    code: 'UNAUTHENTICATED',
    trace_id: randomTraceId(),
  }
}

function hasSession(cookieHeader: string | undefined): boolean {
  return (cookieHeader ?? '').split(';').some((part) => {
    const [name, value] = part.trim().split('=')
    return name === 'session' && Boolean(value)
  })
}

function unauthenticatedReply(path: string): MockReply {
  const problem = unauthenticatedProblem(path)
  return {
    status: 401,
    headers: { 'Content-Type': 'application/problem+json', 'X-Trace-ID': problem.trace_id },
    body: JSON.stringify(problem),
  }
}

/** Ответ мока или `null`, если запрос не к `/api/v1/auth/me` и не к `/logout`. */
export function mockAuthReply(
  method: string,
  url: string,
  cookieHeader: string | undefined,
): MockReply | null {
  const path = url.split('?', 1)[0]
  if (method === 'GET' && path === '/api/v1/auth/me') {
    return hasSession(cookieHeader)
      ? { status: 200, headers: JSON_TYPE, body: JSON.stringify(MOCK_USER) }
      : unauthenticatedReply(path)
  }
  if (method === 'POST' && path === '/api/v1/auth/logout') {
    return {
      status: 204,
      headers: { 'Set-Cookie': 'session=; Path=/; Max-Age=0' },
      body: '',
    }
  }
  return null
}
