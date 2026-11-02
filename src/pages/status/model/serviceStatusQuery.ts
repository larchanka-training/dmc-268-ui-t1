import { useQuery } from '@tanstack/react-query'

import { fetchServiceStatus } from '@/entities/service-status'
import { useTransport } from '@/shared/api'

export const SERVICE_STATUS_KEY = ['service-status'] as const

/** Страница опрашивает статус сама: раз в 30 секунд, пока вкладка видна, и при возврате на неё. */
export const STATUS_REFETCH_INTERVAL_MS = 30_000

/** Сервер кэширует оценку на 15 с: перезапрос раньше вернёт то же самое. */
const STATUS_STALE_TIME_MS = 15_000

export function useServiceStatus() {
  const transport = useTransport()
  return useQuery({
    queryKey: SERVICE_STATUS_KEY,
    queryFn: () => fetchServiceStatus(transport),
    refetchInterval: STATUS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: STATUS_STALE_TIME_MS,
  })
}
