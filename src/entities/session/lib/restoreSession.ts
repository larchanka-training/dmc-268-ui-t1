import { refreshAccessToken } from '@/entities/session/api/authApi'
import { mockRestoreSession } from '@/entities/session/api/mockAuthApi'
import { placeholderUserFromProvider } from '@/entities/session/lib/placeholderUser'
import { loadPersistedUser } from '@/entities/session/lib/tokenStorage'
import type { AuthSession } from '@/entities/session/model/types'
import { USE_MOCK_API } from '@/shared/config/env'

export async function restoreSession(): Promise<AuthSession | null> {
  const user = loadPersistedUser()

  if (USE_MOCK_API) {
    if (!user) {
      return null
    }
    return mockRestoreSession(user)
  }

  try {
    const tokens = await refreshAccessToken()
    const resolvedUser = user ?? placeholderUserFromProvider('github')
    return { user: resolvedUser, tokens }
  } catch {
    return null
  }
}
