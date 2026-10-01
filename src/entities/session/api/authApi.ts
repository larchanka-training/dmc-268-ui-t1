import { parseApiAuthSession, tokensFromApiSession } from '@/entities/session/lib/parseSession'
import type { AuthTokens, OAuthProvider } from '@/entities/session/model/types'
import { API_V1_BASE_URL } from '@/shared/config/env'

export async function exchangeOAuthToken(
  provider: OAuthProvider,
  code: string,
): Promise<AuthTokens> {
  const response = await fetch(`${API_V1_BASE_URL}/auth/oauth/token`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, code }),
  })
  if (!response.ok) {
    throw new Error('Не удалось обменять код авторизации')
  }
  const body: unknown = await response.json()
  const apiSession = parseApiAuthSession(body)
  if (!apiSession) {
    throw new Error('Некорректный ответ авторизации')
  }
  return tokensFromApiSession(apiSession)
}

export async function refreshAccessToken(): Promise<AuthTokens> {
  const response = await fetch(`${API_V1_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error('Token refresh failed')
  }
  const body: unknown = await response.json()
  const apiSession = parseApiAuthSession(body)
  if (!apiSession) {
    throw new Error('Некорректный ответ обновления сессии')
  }
  return tokensFromApiSession(apiSession)
}
