import type { OAuthProvider } from '@/entities/session'

export type RepositoryConnectionStatus = 'connected' | 'syncing' | 'error'

export interface ConnectedRepository {
  id: string
  name: string
  fullName: string
  provider: OAuthProvider
  defaultBranch: string
  private: boolean
  connectedAt: string
  status: RepositoryConnectionStatus
  lastSyncAt?: string
}

export interface AvailableRepository {
  id: string
  name: string
  fullName: string
  provider: OAuthProvider
  defaultBranch: string
  private: boolean
  alreadyConnected: boolean
}
