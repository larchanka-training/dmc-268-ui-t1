import type { AvailableRepository, ConnectedRepository } from '@/entities/repository/model/types'

let connectedRepos: ConnectedRepository[] = [
  {
    id: 'repo-1',
    name: 'platform-api',
    fullName: 'larchanka-training/platform-api',
    provider: 'github',
    defaultBranch: 'main',
    private: false,
    connectedAt: '2026-09-20T10:00:00.000Z',
    status: 'connected',
    lastSyncAt: '2026-09-28T08:30:00.000Z',
  },
  {
    id: 'repo-2',
    name: 'docs',
    fullName: 'larchanka-training/docs',
    provider: 'github',
    defaultBranch: 'main',
    private: true,
    connectedAt: '2026-09-22T14:15:00.000Z',
    status: 'syncing',
    lastSyncAt: '2026-09-28T07:00:00.000Z',
  },
]

const availablePool: AvailableRepository[] = [
  {
    id: 'avail-1',
    name: 'platform-api',
    fullName: 'larchanka-training/platform-api',
    provider: 'github',
    defaultBranch: 'main',
    private: false,
    alreadyConnected: true,
  },
  {
    id: 'avail-2',
    name: 'docs',
    fullName: 'larchanka-training/docs',
    provider: 'github',
    defaultBranch: 'main',
    private: true,
    alreadyConnected: true,
  },
  {
    id: 'avail-3',
    name: 'mobile-app',
    fullName: 'larchanka-training/mobile-app',
    provider: 'github',
    defaultBranch: 'develop',
    private: true,
    alreadyConnected: false,
  },
  {
    id: 'avail-4',
    name: 'infra',
    fullName: 'larchanka-training/infra',
    provider: 'github',
    defaultBranch: 'main',
    private: false,
    alreadyConnected: false,
  },
  {
    id: 'avail-5',
    name: 'legacy-monolith',
    fullName: 'larchanka-training/legacy-monolith',
    provider: 'gitlab',
    defaultBranch: 'master',
    private: true,
    alreadyConnected: false,
  },
]

export function getConnectedRepositories(): ConnectedRepository[] {
  return [...connectedRepos]
}

export function getAvailableRepositories(): AvailableRepository[] {
  const connectedIds = new Set(connectedRepos.map((r) => r.fullName))
  return availablePool.map((repo) => ({
    ...repo,
    alreadyConnected: connectedIds.has(repo.fullName),
  }))
}

export function connectRepository(repoId: string): ConnectedRepository {
  const candidate = availablePool.find((r) => r.id === repoId)
  if (!candidate) {
    throw new Error('Репозиторий не найден')
  }
  if (connectedRepos.some((r) => r.fullName === candidate.fullName)) {
    throw new Error('Репозиторий уже подключён')
  }
  const newRepo: ConnectedRepository = {
    id: `repo-${Date.now()}`,
    name: candidate.name,
    fullName: candidate.fullName,
    provider: candidate.provider,
    defaultBranch: candidate.defaultBranch,
    private: candidate.private,
    connectedAt: new Date().toISOString(),
    status: 'connected',
    lastSyncAt: new Date().toISOString(),
  }
  connectedRepos = [newRepo, ...connectedRepos]
  return newRepo
}
