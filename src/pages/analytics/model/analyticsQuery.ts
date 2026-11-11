import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { fetchAnalytics } from '@/entities/analytics'
import { useTransport } from '@/shared/api'

import { type PeriodDays, periodBounds } from './period'

export function useAnalytics(repositoryId: string | null, days: PeriodDays) {
  const transport = useTransport()
  return useQuery({
    // Ключ — период, а не границы: «сейчас» берётся в момент запроса, а не на рендере.
    queryKey: ['analytics', repositoryId, days] as const,
    queryFn: () => fetchAnalytics(transport, { repositoryId, ...periodBounds(days, Date.now()) }),
    // При смене фильтра остаётся прежний ответ, пока не придёт новый: страница не мигает загрузкой.
    placeholderData: keepPreviousData,
  })
}
