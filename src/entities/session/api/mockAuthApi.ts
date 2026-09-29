import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  OAuthProvider,
} from '@/entities/session/model/types'

const MOCK_USERS: Record<OAuthProvider, AuthUser> = {
  github: {
    id: 'gh-1001',
    login: 'dev-user',
    name: 'Тестовый пользователь',
    avatarUrl: 'https://avatars.githubusercontent.com/u/9919?s=64&v=4',
    provider: 'github',
  },
  gitlab: {
    id: 'gl-2001',
    login: 'dev-user',
    name: 'Тестовый пользователь',
    avatarUrl: 'https://gitlab.com/uploads/-/system/user/avatar/1/avatar.png',
    provider: 'gitlab',
  },
}

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

function createTokens(provider: OAuthProvider): AuthTokens {
  const now = Date.now()
  return {
    accessToken: `mock_access_${provider}_${now}`,
    refreshToken: `mock_refresh_${provider}_${now}`,
    expiresAt: now + 60 * 1000,
  }
}

export async function mockExchangeCode(
  code: string,
  provider: OAuthProvider,
): Promise<AuthSession> {
  await delay()
  if (!code.startsWith('mock_')) {
    throw new Error('Неверный код авторизации')
  }
  const user = MOCK_USERS[provider]
  return {
    user,
    tokens: createTokens(provider),
  }
}

export async function mockRefreshTokens(refreshToken: string): Promise<AuthTokens> {
  await delay(300)
  if (!refreshToken.startsWith('mock_refresh_')) {
    throw new Error('Неверный refresh-токен')
  }
  const provider = refreshToken.includes('gitlab') ? 'gitlab' : 'github'
  return createTokens(provider)
}

export function buildMockAuthorizeUrl(provider: OAuthProvider, state: string): string {
  const params = new URLSearchParams({
    provider,
    state,
    code: `mock_${provider}_auth_code`,
  })
  return `/oauth/callback?${params.toString()}`
}
