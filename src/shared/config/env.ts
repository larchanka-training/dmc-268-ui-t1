/** Базовый URL API v1 (OpenAPI servers: /api/v1). */
export const API_V1_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const OAUTH_REDIRECT_URI =
  import.meta.env.VITE_OAUTH_REDIRECT_URI ?? `${window.location.origin}/oauth/callback`

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'
