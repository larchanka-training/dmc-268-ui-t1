import { useQuery } from '@tanstack/react-query'

import { parseResponse, useTransport } from '../../../shared/api'
import { FindingsResponseSchema } from '../model/schema'

export const findingKeys = {
  list: (runId: string) => ['review-runs', runId, 'findings'] as const,
}

type Options = {
  /** Интервал опроса, пока прогон не завершён: замечания появляются по ходу публикации. */
  refetchInterval?: number | false
}

export function useFindings(runId: string, { refetchInterval = false }: Options = {}) {
  const transport = useTransport()
  return useQuery({
    queryKey: findingKeys.list(runId),
    queryFn: async () => {
      const path = `/review-runs/${encodeURIComponent(runId)}/findings`
      return parseResponse(FindingsResponseSchema, path, await transport.get(path))
    },
    refetchInterval,
  })
}
