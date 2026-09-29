export type OAuthProvider = 'github' | 'gitlab'

export interface AuthUser {
  id: string
  login: string
  name: string
  avatarUrl: string
  provider: OAuthProvider
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface AuthSession {
  user: AuthUser
  tokens: AuthTokens
}
