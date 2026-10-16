export type OAuthProvider = 'github' | 'gitlab'

/** Пользователь текущей сессии — ответ `GET /api/v1/auth/me`. */
export interface CurrentUser {
  provider: OAuthProvider
  login: string
  name: string | null
  avatarUrl: string | null
}
