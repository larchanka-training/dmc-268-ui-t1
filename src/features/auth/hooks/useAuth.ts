import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

import { fetchCurrentUser, logoutSession, type CurrentUser } from '@/entities/session'
import { navigation } from '@/shared/lib'

export const CURRENT_USER_KEY = ['auth', 'me'] as const

export interface Auth {
  user: CurrentUser | null
  isLoading: boolean
  /** Ответ `/auth/me` не прочитан: сбой сети, 5xx или ответ вне схемы. */
  error: Error | null
  logout: () => Promise<void>
}

/**
 * Профиль — серверные данные, поэтому живёт в кэше TanStack Query, а не в store.
 * `401` здесь не обрабатывается: его увёл на `/login` общий `apiFetch`.
 */
export function useAuth(): Auth {
  const { data, isPending, error } = useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
  })

  const logout = useCallback(async () => {
    try {
      await logoutSession()
    } catch {
      // Сессия на бэкенде могла остаться, но в кабинете пользователь не остаётся.
    } finally {
      navigation.assign('/')
    }
  }, [])

  return { user: data ?? null, isLoading: isPending, error, logout }
}
