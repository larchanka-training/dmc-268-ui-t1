import type { AuthUser, OAuthProvider } from '@/entities/session/model/types'

export function placeholderUserFromProvider(provider: OAuthProvider): AuthUser {
  return {
    id: `oauth-${provider}`,
    login: provider,
    name: 'Пользователь',
    avatarUrl: '',
    provider,
  }
}
