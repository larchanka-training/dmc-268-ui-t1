import { useQuery } from '@tanstack/react-query'

import { parseResponse, useTransport } from '../../../shared/api'
import { isTerminalStatus, ReviewRunSchema } from '../model/schema'

/** Как часто опрашивать активный прогон (FE-DEC-08: polling, без SSE). */
export const RUN_POLL_INTERVAL_MS = 3000

export const reviewRunKeys = {
  run: (runId: string) => ['review-runs', runId] as const,
}

export function useReviewRun(runId: string) {
  const transport = useTransport()
  return useQuery({
    queryKey: reviewRunKeys.run(runId),
    queryFn: async () => {
      const path = `/review-runs/${encodeURIComponent(runId)}`
      return parseResponse(ReviewRunSchema, path, await transport.get(path))
    },
    // О завершении судит только сервер: опрашиваем, пока статус нетерминальный.
    refetchInterval: (query) => {
      const run = query.state.data
      return run && isTerminalStatus(run.status) ? false : RUN_POLL_INTERVAL_MS
    },
  })
}
