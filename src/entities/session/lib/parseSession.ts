import type {
  ApiAuthSession,
  AuthSession,
  AuthTokens,
  AuthUser,
  OAuthProvider,
} from '@/entities/session/model/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOAuthProvider(value: unknown): value is OAuthProvider {
  return value === 'github' || value === 'gitlab'
}

export function parseAuthUser(value: unknown): AuthUser | null {
  if (!isRecord(value)) {
    return null
  }
  if (
    typeof value.id !== 'string' ||
    typeof value.login !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.avatarUrl !== 'string' ||
    !isOAuthProvider(value.provider)
  ) {
    return null
  }
  return {
    id: value.id,
    login: value.login,
    name: value.name,
    avatarUrl: value.avatarUrl,
    provider: value.provider,
  }
}

export function parseApiAuthSession(value: unknown): ApiAuthSession | null {
  if (!isRecord(value)) {
    return null
  }
  if (
    typeof value.accessToken !== 'string' ||
    typeof value.expiresIn !== 'number' ||
    !Number.isFinite(value.expiresIn) ||
    value.expiresIn < 1
  ) {
    return null
  }
  return {
    accessToken: value.accessToken,
    expiresIn: value.expiresIn,
  }
}

export function tokensFromApiSession(api: ApiAuthSession): AuthTokens {
  return {
    accessToken: api.accessToken,
    expiresAt: Date.now() + api.expiresIn * 1000,
  }
}

/** Разбор устаревшей записи localStorage (токены + user) для миграции. */
export function parseLegacyStoredSession(value: unknown): AuthSession | null {
  if (!isRecord(value)) {
    return null
  }
  const user = parseAuthUser(value.user)
  const tokens = value.tokens
  if (!user || !isRecord(tokens)) {
    return null
  }
  if (typeof tokens.accessToken !== 'string' || typeof tokens.expiresAt !== 'number') {
    return null
  }
  const refreshToken = typeof tokens.refreshToken === 'string' ? tokens.refreshToken : undefined
  return {
    user,
    tokens: {
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      refreshToken,
    },
  }
}
