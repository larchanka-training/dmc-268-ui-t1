import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

import { fetchCurrentUser, logoutSession, type CurrentUser } from '@/entities/session'
import { navigation } from '@/shared/lib'

const CURRENT_USER_KEY = ['auth', 'me'] as const

/** Профиль считается свежим полминуты: чаще при возврате в вкладку не перезапрашиваем. */
const PROFILE_STALE_TIME_MS = 30_000

export interface Auth {
  user: CurrentUser | null
  /** Ответ `/auth/me` не прочитан: сбой сети, 5xx или ответ вне схемы. */
  error: Error | null
}

/**
 * Профиль — серверные данные, поэтому живёт в кэше TanStack Query, а не в store.
 * Запрос один на приложение: его делает `RequireAuth` в корне маршрутов, остальные
 * читают профиль из того же кэша через `useCurrentUser`.
 * `401` здесь не обрабатывается: его увёл на `/login` общий `apiFetch`.
 */
export function useAuth(): Auth {
  const { data, error } = useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: fetchCurrentUser,
    staleTime: PROFILE_STALE_TIME_MS,
    // Выход в другой вкладке: при возврате в эту вкладку `/auth/me` ответит `401`,
    // и `apiFetch` уведёт на `/login`. Общий `refetchOnWindowFocus: false` здесь снят.
    refetchOnWindowFocus: true,
    // Повторный монтаж `RequireAuth` (переход между экраном прогона и кабинетом)
    // берёт профиль из кэша, а не перезапрашивает его каждые полминуты.
    refetchOnMount: false,
  })

  return { user: data ?? null, error }
}

/**
 * Профиль вошедшего пользователя. Только под `RequireAuth`: тот без профиля детей
 * не рендерит, поэтому здесь он есть всегда.
 */
export function useCurrentUser(): CurrentUser {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser вызван вне RequireAuth')
  return user
}

/** Выход: удалить сессию на бэкенде и уйти на `/` при любом исходе. */
export function useLogout(): () => Promise<void> {
  return useCallback(async () => {
    try {
      await logoutSession()
    } catch {
      // Сессия на бэкенде могла остаться, но в кабинете пользователь не остаётся.
    } finally {
      navigation.assign('/')
    }
  }, [])
}
