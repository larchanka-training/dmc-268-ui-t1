/** Mock OAuth — replace with real API base URL when backend is ready. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const OAUTH_REDIRECT_URI =
  import.meta.env.VITE_OAUTH_REDIRECT_URI ?? `${window.location.origin}/oauth/callback`

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'
