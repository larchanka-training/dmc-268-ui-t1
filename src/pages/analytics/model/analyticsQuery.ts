import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { fetchAnalytics, type AnalyticsQuery } from '@/entities/analytics'
import { useTransport } from '@/shared/api'

export function useAnalytics(query: AnalyticsQuery) {
  const transport = useTransport()
  return useQuery({
    queryKey: ['analytics', query.repositoryId, query.createdFrom, query.createdTo] as const,
    queryFn: () => fetchAnalytics(transport, query),
    // При смене фильтра остаётся прежний ответ, пока не придёт новый: страница не мигает загрузкой.
    placeholderData: keepPreviousData,
  })
}
