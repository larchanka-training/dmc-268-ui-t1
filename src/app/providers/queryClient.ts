import { QueryClient } from '@tanstack/react-query'

import { ApiError, ContractError } from '../../shared/api'

const MAX_RETRIES = 2

/** Повторяем только то, что может пройти со второй попытки: сбой сети или 5xx. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  // 4xx и ответ вне схемы повторять бессмысленно: ответ не изменится.
  if (error instanceof ApiError && error.status < 500) return false
  if (error instanceof ContractError) return false
  return failureCount < MAX_RETRIES
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  })
}
