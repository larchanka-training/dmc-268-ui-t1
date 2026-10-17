/**
 * Ошибка ответа API. `code` — машинный код из тела `{code, message}`
 * (`UNAUTHENTICATED`, `ORIGIN_FORBIDDEN` и др.), если бэкенд его прислал.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}
