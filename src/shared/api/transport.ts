import { createContext, useContext } from 'react'

/**
 * Граница данных: HTTP-клиент и mock adapter реализуют один и тот же контракт.
 * Ответ приходит как `unknown` — форму проверяет entity API своей схемой.
 */
export type ApiTransport = {
  get: (path: string) => Promise<unknown>
  /** Изменяющий запрос с JSON-телом; ответ без тела (`204`) — `null`. */
  post: (path: string, body: unknown) => Promise<unknown>
  /** Заменяющий запрос с JSON-телом (`PUT` в контракте); ответ без тела (`204`) — `null`. */
  put: (path: string, body: unknown) => Promise<unknown>
}

export const TransportContext = createContext<ApiTransport | null>(null)

export function useTransport(): ApiTransport {
  const transport = useContext(TransportContext)
  if (!transport) {
    throw new Error('useTransport вызван вне TransportContext')
  }
  return transport
}
