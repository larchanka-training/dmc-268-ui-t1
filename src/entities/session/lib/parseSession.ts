import type { AuthSession, AuthUser, OAuthProvider } from '@/entities/session/model/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOAuthProvider(value: unknown): value is OAuthProvider {
  return value === 'github' || value === 'gitlab'
}

function parseAuthUser(value: unknown): AuthUser | null {
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

export function parseAuthSession(value: unknown): AuthSession | null {
  if (!isRecord(value)) {
    return null
  }
  const user = parseAuthUser(value.user)
  const tokens = value.tokens
  if (!user || !isRecord(tokens)) {
    return null
  }
  if (
    typeof tokens.accessToken !== 'string' ||
    typeof tokens.refreshToken !== 'string' ||
    typeof tokens.expiresAt !== 'number' ||
    !Number.isFinite(tokens.expiresAt)
  ) {
    return null
  }
  return {
    user,
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    },
  }
}
