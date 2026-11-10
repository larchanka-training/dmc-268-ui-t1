export type OAuthProvider = 'github' | 'gitlab'

/** Пользователь текущей сессии — ответ `GET /api/v1/auth/me`. */
export interface CurrentUser {
  provider: OAuthProvider
  login: string
  name: string | null
  avatarUrl: string | null
  /** Баланс в евро — десятичная строка API как есть (`"4.75"`, `"-0.01"`). */
  balanceEur: string
  /** Репозитории, за которые платит пользователь, по `full_name`; в том числе те, что он уже не видит. */
  paidRepositories: PaidRepository[]
}

export interface PaidRepository {
  id: string
  fullName: string
}
