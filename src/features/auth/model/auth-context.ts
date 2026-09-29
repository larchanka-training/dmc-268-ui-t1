import { createContext } from 'react'
import type { AuthSession, AuthUser } from '@/entities/session'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  loginWithSession: (session: AuthSession) => void
  logout: () => void
  getAccessToken: () => string | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)
