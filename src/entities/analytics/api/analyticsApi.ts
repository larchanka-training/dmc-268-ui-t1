import { parseResponse, type ApiTransport } from '@/shared/api'

import { AnalyticsSchema, type Analytics } from '../model/schema'

const ANALYTICS_PATH = '/analytics'

export type AnalyticsQuery = {
  /** Только этот репозиторий; `null` — все видимые. */
  repositoryId: string | null
  /** Границы периода, ISO 8601 с зоной. Передаются обе: без `created_to` конец берётся по часам сервера. */
  createdFrom: string
  createdTo: string
}

/** Аналитика за период: замечания по UTC-дням и длительность прогонов. */
export async function fetchAnalytics(
  transport: ApiTransport,
  query: AnalyticsQuery,
): Promise<Analytics> {
  const params = new URLSearchParams({
    created_from: query.createdFrom,
    created_to: query.createdTo,
  })
  if (query.repositoryId) params.set('repository_id', query.repositoryId)
  const path = `${ANALYTICS_PATH}?${params}`
  return parseResponse(AnalyticsSchema, path, await transport.get(path))
}
