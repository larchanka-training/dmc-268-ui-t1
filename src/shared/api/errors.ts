/**
 * Ошибка ответа API. Тело ошибки — problem details по RFC 9457: `code` — машинный
 * код (`UNAUTHENTICATED`, `ORIGIN_FORBIDDEN` и др.), `message` — `detail` из тела,
 * а если его нет — общий текст про статус. `traceId` — `X-Trace-ID` ответа: по нему
 * ошибка находится в логах и трейсах API.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly traceId: string | undefined

  constructor(status: number, message: string, code?: string, traceId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.traceId = traceId
  }
}

/**
 * Ручка описана в контракте, но бэкенд отвечает заглушкой `501 NOT_IMPLEMENTED`:
 * экран показывает «пока не реализовано», а не ошибку с повтором.
 */
export function isNotImplemented(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NOT_IMPLEMENTED'
}
