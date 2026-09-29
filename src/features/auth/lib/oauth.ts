import {
  buildMockAuthorizeUrl,
  mockExchangeCode,
  type AuthSession,
  type OAuthProvider,
} from '@/entities/session'
import { OAUTH_REDIRECT_URI, USE_MOCK_API } from '@/shared/config/env'

const OAUTH_STATE_KEY = 'dmc268.oauth.state'
const OAUTH_PROVIDER_KEY = 'dmc268.oauth.provider'

let inFlightCallback: Promise<AuthSession> | null = null
let inFlightCallbackKey = ''
const completedCallbacks = new Map<string, AuthSession>()

export function startOAuthLogin(provider: OAuthProvider): void {
  const state = crypto.randomUUID()
  sessionStorage.setItem(OAUTH_STATE_KEY, state)
  sessionStorage.setItem(OAUTH_PROVIDER_KEY, provider)

  if (USE_MOCK_API) {
    window.location.assign(buildMockAuthorizeUrl(provider, state))
    return
  }

  const authorizeUrl = new URL(
    `${provider === 'github' ? 'https://github.com' : 'https://gitlab.com'}/login/oauth/authorize`,
  )
  authorizeUrl.searchParams.set('client_id', import.meta.env.VITE_OAUTH_CLIENT_ID ?? '')
  authorizeUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI)
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('scope', 'read_user repo')
  window.location.assign(authorizeUrl.toString())
}

function clearOAuthSession(): void {
  sessionStorage.removeItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(OAUTH_PROVIDER_KEY)
}

export async function completeOAuthCallback(
  code: string | null,
  state: string | null,
): Promise<AuthSession> {
  const callbackKey = `${code ?? ''}:${state ?? ''}`
  const cached = completedCallbacks.get(callbackKey)
  if (cached) {
    return cached
  }
  if (inFlightCallback && inFlightCallbackKey === callbackKey) {
    return inFlightCallback
  }

  inFlightCallbackKey = callbackKey
  inFlightCallback = (async () => {
    try {
      const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY)
      const provider = (sessionStorage.getItem(OAUTH_PROVIDER_KEY) ?? 'github') as OAuthProvider

      if (!code) {
        throw new Error('Код авторизации не передан')
      }
      if (!state || !expectedState || state !== expectedState) {
        throw new Error('Неверный параметр OAuth state')
      }

      let session: AuthSession
      if (USE_MOCK_API) {
        session = await mockExchangeCode(code, provider)
      } else {
        const response = await fetch('/api/auth/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, provider, redirectUri: OAUTH_REDIRECT_URI }),
        })
        if (!response.ok) {
          throw new Error('Не удалось обменять код авторизации')
        }
        session = (await response.json()) as AuthSession
      }
      completedCallbacks.set(callbackKey, session)
      return session
    } finally {
      clearOAuthSession()
      inFlightCallback = null
      inFlightCallbackKey = ''
    }
  })()

  return inFlightCallback
}
