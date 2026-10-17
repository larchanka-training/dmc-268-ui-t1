/**
 * Мок `/api/v1/auth/*` для dev-сервера. Ведёт себя как бэкенд (api#47) в той
 * части, которую видит кабинет: есть cookie `session` с любым значением —
 * вошёл, нет — `401`. Тем же правилом nginx пускает в `/app/`, поэтому
 * локально вход — cookie `session` в DevTools, как в README.
 */

export type MockReply = { status: number; headers: Record<string, string>; body: string }

export const MOCK_USER = {
  provider: 'github',
  login: 'dev',
  name: 'Локальный пользователь',
  avatar_url: null,
}

const JSON_TYPE = { 'Content-Type': 'application/json' }

function hasSession(cookieHeader: string | undefined): boolean {
  return (cookieHeader ?? '').split(';').some((part) => {
    const [name, value] = part.trim().split('=')
    return name === 'session' && Boolean(value)
  })
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
      : {
          status: 401,
          headers: JSON_TYPE,
          body: JSON.stringify({ code: 'UNAUTHENTICATED', message: 'требуется вход' }),
        }
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
