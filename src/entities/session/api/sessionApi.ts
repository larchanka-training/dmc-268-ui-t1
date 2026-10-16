import { z } from 'zod'

import type { CurrentUser } from '@/entities/session/model/types'
import { apiFetch, parseResponse } from '@/shared/api'

const ME_PATH = '/auth/me'

// Поля в snake_case — как отвечает бэкенд (openapi.yaml, CurrentUser).
export const currentUserSchema = z.object({
  provider: z.enum(['github', 'gitlab']),
  login: z.string().min(1),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
})

/** Профиль из сессии. Без сессии `apiFetch` уже увёл на `/login` и бросил `ApiError(401)`. */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await apiFetch(ME_PATH)
  const data: unknown = await response.json()
  const me = parseResponse(currentUserSchema, ME_PATH, data)
  return { provider: me.provider, login: me.login, name: me.name, avatarUrl: me.avatar_url }
}

/** Удаляет сессию на бэкенде; cookie удаляет ответ. */
export async function logoutSession(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' })
}
