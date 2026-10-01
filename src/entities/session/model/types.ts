export type OAuthProvider = 'github' | 'gitlab'

export interface AuthUser {
  id: string
  login: string
  name: string
  avatarUrl: string
  provider: OAuthProvider
}

/** Ответ POST /auth/oauth/token и POST /auth/refresh (OpenAPI AuthSession). */
export interface ApiAuthSession {
  accessToken: string
  expiresIn: number
}

export interface AuthTokens {
  accessToken: string
  expiresAt: number
  /** Только mock; в проде refresh в httpOnly cookie на /api/v1/auth/refresh */
  refreshToken?: string
}

export interface AuthSession {
  user: AuthUser
  tokens: AuthTokens
}
