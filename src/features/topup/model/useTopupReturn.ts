import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

import { CURRENT_USER_KEY, fetchCurrentUser } from '@/entities/session'

const POLL_INTERVAL_MS = 3_000
const POLL_LIMIT_MS = 60_000

/**
 * Возврат из Stripe (`?topup=success&session_id=…`): параметры убираются из адреса, а `/auth/me`
 * минуту перечитывается, чтобы карточка «Баланс» показала зачисление: его делает вебхук бэкенда,
 * он может прийти позже возврата. Возвращает `true`, если страница открыта после оплаты.
 */
export function useTopupReturn(): boolean {
  const [params, setParams] = useSearchParams()
  // Конец опроса запоминается на первом рендере: параметр из адреса к тому моменту уже убран.
  const [deadline] = useState(() =>
    params.get('topup') === 'success' ? Date.now() + POLL_LIMIT_MS : null,
  )

  useEffect(() => {
    if (!params.has('topup') && !params.has('session_id')) return
    const next = new URLSearchParams(params)
    next.delete('topup')
    next.delete('session_id')
    setParams(next, { replace: true })
  }, [params, setParams])

  // Тот же ключ, что у профиля в `useAuth`: свежий баланс попадает и в шапку.
  useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: fetchCurrentUser,
    enabled: deadline !== null,
    refetchInterval: () => (Date.now() < (deadline ?? 0) ? POLL_INTERVAL_MS : false),
    refetchIntervalInBackground: true,
  })

  return deadline !== null
}
