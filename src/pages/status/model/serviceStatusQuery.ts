import { useQuery } from '@tanstack/react-query'

import { fetchServiceStatus } from '@/entities/service-status'
import { useTransport } from '@/shared/api'

const SERVICE_STATUS_KEY = ['service-status'] as const

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
    // Без повторов при ошибке: опрос и так повторит запрос через 30 секунд. Общие повторы
    // (`shouldRetry`) при зависшем API — ещё два таймаута nginx по 60 с, и всё это время
    // страница показывала бы прошлое «Работает».
    retry: false,
  })
}
