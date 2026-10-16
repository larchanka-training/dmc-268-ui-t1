import { API_V1_BASE_URL } from '@/shared/config/env'
import { redirectToLogin } from '@/shared/lib'

import { ApiError } from './transport'

/**
 * Запрос к API с cookie сессии. Токенов в JS нет, поэтому и `Authorization`
 * нет. `401` от любой ручки — сессии нет или она истекла: браузер уходит на
 * `/login` и вернётся на этот же экран после входа.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${API_V1_BASE_URL}${path}`, { ...init, credentials: 'include' })
  if (response.status === 401) {
    redirectToLogin()
    throw new ApiError(401, 'Требуется вход')
  }
  if (!response.ok) {
    throw new ApiError(response.status, `Запрос ${path} завершился ошибкой ${response.status}`)
  }
  return response
}
