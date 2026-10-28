import type {
  AvailableRepository,
  ConnectRepositoryRequest,
  Repository,
} from '../../entities/repository'
import { ApiError } from '../../shared/api'

/**
 * Id подключённого репозитория `n` (с единицы, по порядку подключения). В контракте id
 * репозитория — uuid, и фильтр `repository_id` вкладки «Ревью» другие значения отбрасывает,
 * поэтому моки отдают uuid. Им же ссылаются на репозиторий прогоны из `fixtures.ts` и
 * `reviewRuns.ts`: 1 — `platform-api`, 2 — `docs`.
 */
export function mockRepositoryId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

/** Репозиторий установки GitHub App, ещё не обязательно подключённый. */
type InstallationRepository = Omit<AvailableRepository, 'already_connected'>

const installation: InstallationRepository[] = [
  ['101', 'larchanka-training/platform-api', 'main'],
  ['102', 'larchanka-training/docs', 'main'],
  ['103', 'larchanka-training/mobile-app', 'develop'],
  ['104', 'larchanka-training/infra', 'main'],
  ['105', 'larchanka-training/design-system', 'main'],
].map(([provider_id, full_name, default_branch]) => ({
  provider: 'github',
  provider_id,
  full_name,
  default_branch,
  // `infra` — роль ниже maintain: кнопка «Подключить» неактивна (#45).
  can_connect: provider_id !== '104',
}))

const registered = (repo: InstallationRepository, n: number, at: string): Repository => ({
  id: mockRepositoryId(n),
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
    // `auto_review_enabled` выключен, как в фикстуре настроек: список и экран настроек сходятся.
    { ...registered(installation[1], 2, '2026-09-22T14:15:00Z'), auto_review_enabled: false },
    // Третий репозиторий — сценарий «файл правил есть, но применимых правил нет» (repositorySettings).
    registered(installation[4], 3, '2026-09-25T09:00:00Z'),
  ]
  const isConnected = (repo: InstallationRepository) =>
    connected.some((r) => r.provider === repo.provider && r.provider_id === repo.provider_id)

  return {
    list: () => ({ items: [...connected] }),
    available: () => ({
      items: installation.map((repo) => ({ ...repo, already_connected: isConnected(repo) })),
    }),
    /** Подключённый репозиторий по id — граница блока настроек (#29). */
    find: (repositoryId: string) => connected.find((repo) => repo.id === repositoryId),
    /** Один репозиторий `GET /repositories/{id}`: как бэкенд, 404 для чужого id. */
    get: (repositoryId: string): Repository => {
      const repo = connected.find((item) => item.id === repositoryId)
      if (!repo) throw new ApiError(404, 'Репозиторий не найден', 'REPOSITORY_NOT_FOUND')
      return { ...repo }
    },
    /** Флаг авто-ревью — колонка репозитория: сохранение настроек меняет и её. */
    setAutoReviewEnabled: (repositoryId: string, enabled: boolean) => {
      connected = connected.map((repo) =>
        repo.id === repositoryId ? { ...repo, auto_review_enabled: enabled } : repo,
      )
    },
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
