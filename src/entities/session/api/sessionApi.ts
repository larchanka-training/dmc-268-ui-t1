import { z } from 'zod'

import type { CurrentUser } from '@/entities/session/model/types'
import { apiFetch, parseResponse } from '@/shared/api'
import type { ApiSchemas, MatchesContract } from '@/shared/api/contract'

const ME_PATH = '/auth/me'

// Поля в snake_case — как отвечает бэкенд (контракт, `UserResponse`).
export const currentUserSchema = z.object({
  provider: z.enum(['github', 'gitlab']),
  login: z.string().min(1),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
})

// Ответ разбирается ровно в тип `UserResponse` из контракта; разойдутся — упадёт typecheck.
const contractCheck: MatchesContract<
  z.infer<typeof currentUserSchema>,
  ApiSchemas['UserResponse']
> = true
void contractCheck

/** Профиль из сессии. Без сессии `apiFetch` уже увёл на `/login` и бросил `ApiError(401)`. */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await apiFetch(ME_PATH)
  const data: unknown = await response.json()
  const me = parseResponse(currentUserSchema, ME_PATH, data)
  return { provider: me.provider, login: me.login, name: me.name, avatarUrl: me.avatar_url }
}

/** Удаляет сессию на бэкенде; cookie удаляет ответ. */
export async function logoutSession(): Promise<void> {
  // `401` — сессия уже закончилась в другом месте: на `/login` не уводим, выход всё равно на `/`.
  await apiFetch('/auth/logout', { method: 'POST' }, { redirectOn401: false })
}
