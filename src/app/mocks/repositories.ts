import type {
  AvailableRepository,
  ConnectRepositoryRequest,
  Repository,
} from '../../entities/repository'
import { ApiError } from '../../shared/api'

/** Репозиторий установки GitHub App, ещё не обязательно подключённый. */
type InstallationRepository = Omit<AvailableRepository, 'already_connected'>

const installation: InstallationRepository[] = [
  ['101', 'larchanka-training/platform-api', 'main'],
  ['102', 'larchanka-training/docs', 'main'],
  ['103', 'larchanka-training/mobile-app', 'develop'],
  ['104', 'larchanka-training/infra', 'main'],
].map(([provider_id, full_name, default_branch]) => ({
  provider: 'github',
  provider_id,
  full_name,
  default_branch,
}))

const registered = (repo: InstallationRepository, n: number, at: string): Repository => ({
  id: `repo-${n}`,
  provider: repo.provider,
  provider_id: repo.provider_id,
  full_name: repo.full_name,
  default_branch: repo.default_branch,
  auto_review_enabled: true,
  created_at: at,
  updated_at: at,
})

/**
 * Хранилище репозиториев mock adapter: отвечает так же, как бэкенд по контракту, — списки в
 * `{items}`, подключение возвращает `RepositoryResponse`, ошибки — `ApiError` с кодом.
 */
export function createRepositoryStore() {
  let connected: Repository[] = [
    registered(installation[0], 1, '2026-09-20T10:00:00Z'),
    registered(installation[1], 2, '2026-09-22T14:15:00Z'),
  ]
  const isConnected = (repo: InstallationRepository) =>
    connected.some((r) => r.provider === repo.provider && r.provider_id === repo.provider_id)

  return {
    list: () => ({ items: [...connected] }),
    available: () => ({
      items: installation.map((repo) => ({ ...repo, already_connected: isConnected(repo) })),
    }),
    connect: ({ provider, provider_id }: ConnectRepositoryRequest): Repository => {
      const repo = installation.find(
        (r) => r.provider === provider && r.provider_id === provider_id,
      )
      if (!repo) throw new ApiError(404, 'Репозитория нет в установке GitHub App', 'NOT_FOUND')
      if (isConnected(repo)) throw new ApiError(409, 'Репозиторий уже подключён', 'CONFLICT')
      const created = registered(repo, connected.length + 1, new Date().toISOString())
      connected = [...connected, created]
      return created
    },
  }
}
