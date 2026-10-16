import { Result, Spin } from 'antd'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { ApiError } from '@/shared/api'

/**
 * Кабинет только для вошедшего. Гостя на стенде до SPA не пускает nginx, а
 * протухшую сессию ловит `apiFetch`: `401` уводит на `/login`. Здесь остаётся
 * дождаться профиля и не показать кабинет без него.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, error } = useAuth()

  if (user) return children

  const unauthenticated = error instanceof ApiError && error.status === 401
  if (error && !unauthenticated) {
    return (
      <Result status="error" title="Не удалось загрузить профиль" subTitle="Обновите страницу." />
    )
  }

  // Загрузка — или уже уходим на `/login`.
  return (
    <div className="flex justify-center p-20">
      <Spin size="large" />
    </div>
  )
}
