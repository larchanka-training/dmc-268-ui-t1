import { createContext, useContext } from 'react'

/**
 * Граница данных: HTTP-клиент и mock adapter реализуют один и тот же контракт.
 * Ответ приходит как `unknown` — форму проверяет entity API своей схемой.
 */
export type ApiTransport = {
  get: (path: string) => Promise<unknown>
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const TransportContext = createContext<ApiTransport | null>(null)

export function useTransport(): ApiTransport {
  const transport = useContext(TransportContext)
  if (!transport) {
    throw new Error('useTransport вызван вне TransportContext')
  }
  return transport
}
