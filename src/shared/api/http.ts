import { API_V1_BASE_URL } from '@/shared/config/env'
import { redirectToLogin } from '@/shared/lib'

import { ApiError } from './errors'
import type { ApiTransport } from './transport'

export interface ApiFetchOptions {
  /** `false` — на `401` не уводить на `/login`, только бросить `ApiError(401)` (выход). */
  redirectOn401?: boolean
}

/**
 * Запрос к API с cookie сессии. Токенов в JS нет, поэтому и `Authorization`
 * нет. `401` от любой ручки — сессии нет или она истекла: браузер уходит на
 * `/login` и вернётся на этот же экран после входа.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  { redirectOn401 = true }: ApiFetchOptions = {},
): Promise<Response> {
  const response = await fetch(`${API_V1_BASE_URL}${path}`, { ...init, credentials: 'include' })
  if (response.status === 401) {
    if (redirectOn401) redirectToLogin()
    const { code, detail } = await readProblem(response)
    throw new ApiError(401, detail ?? 'Требуется вход', code)
  }
  if (!response.ok) {
    const { code, detail } = await readProblem(response)
    throw new ApiError(
      response.status,
      detail ?? `Запрос ${path} завершился ошибкой ${response.status}`,
      code,
    )
  }
  return response
}

/**
 * `code` и `detail` из тела ошибки. Бэкенд отвечает по RFC 9457
 * (`application/problem+json`): ветвимся по `code`, `detail` — текст для человека.
 * Тип содержимого не проверяем: тело не по форме или не JSON — оба поля `undefined`.
 */
async function readProblem(
  response: Response,
): Promise<{ code: string | undefined; detail: string | undefined }> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      return {
        code: 'code' in body && typeof body.code === 'string' ? body.code : undefined,
        detail: 'detail' in body && typeof body.detail === 'string' ? body.detail : undefined,
      }
    }
  } catch {
    // Пустое или не JSON-тело — ни кода, ни текста.
  }
  return { code: undefined, detail: undefined }
}

/**
 * HTTP-реализация `ApiTransport`. Строится на `apiFetch`, поэтому cookie сессии и
 * уход на `/login` по `401` работают и для данных кабинета: в обход `fetch` не ходим.
 */
export function createHttpTransport(): ApiTransport {
  return {
    get: async (path) => (await apiFetch(path)).json() as Promise<unknown>,
    post: async (path, body) => {
      const response = await apiFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return response.status === 204 ? null : (response.json() as Promise<unknown>)
    },
  }
}
