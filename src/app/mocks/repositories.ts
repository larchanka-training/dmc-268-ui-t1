import type {
  ConnectRepositoryRequest,
  Repository,
  RepositoryList,
  RepositoryListItem,
} from '../../entities/repository'
import { ApiError } from '../../shared/api'

/**
 * Id репозитория `n` в сервисе (с единицы, по порядку подключения). В контракте id
 * репозитория — uuid, и фильтр `repository_id` вкладки «Ревью» другие значения отбрасывает,
 * поэтому моки отдают uuid. Им же ссылаются на репозиторий прогоны из `fixtures.ts` и
 * `reviewRuns.ts`: 1 — `platform-api`, 2 — `docs`.
 */
export function mockRepositoryId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

/** Адрес экрана установки приложения, как его строит бэкенд из slug. */
export const MOCK_INSTALL_URL = 'https://github.com/apps/dmc-268-review/installations/new'

/** Репозиторий установки GitHub App, как его видит пользователь; `can_connect` — его права. */
type InstallationRepository = Pick<
  RepositoryListItem,
  'provider' | 'provider_id' | 'full_name' | 'default_branch' | 'can_connect'
>

const installation: InstallationRepository[] = (
  [
    ['101', 'larchanka-training/platform-api', 'main', true],
    ['102', 'larchanka-training/docs', 'main', true],
    ['103', 'larchanka-training/mobile-app', 'develop', true],
    // Роль write: репозиторий виден, а включить ревью нельзя.
    ['104', 'larchanka-training/infra', 'main', false],
    ['105', 'larchanka-training/design-system', 'main', true],
    ['106', 'larchanka-training/legacy-web', 'master', true],
  ] as const
).map(([provider_id, full_name, default_branch, can_connect]) => ({
  provider: 'github',
  provider_id,
  full_name,
  default_branch,
  can_connect,
}))

/** Запись сервиса: `connectedAt = null` — ревью выключено, запись и история остаются. */
type Registered = { repo: Repository; connectedAt: string | null }

const registered = (
  source: InstallationRepository,
  n: number,
  at: string,
  connectedAt: string | null = at,
): Registered => ({
  repo: {
    id: mockRepositoryId(n),
    provider: source.provider,
    provider_id: source.provider_id,
    full_name: source.full_name,
    default_branch: source.default_branch,
    auto_review_enabled: true,
    created_at: at,
    updated_at: at,
  },
  connectedAt,
})

/**
 * Хранилище репозиториев mock adapter: отвечает так же, как бэкенд по контракту, — список
 * `{items, install_url}` со строками всех видов, включение возвращает `RepositoryResponse`,
 * выключение — `204` (`null`), ошибки — `ApiError` с кодом.
 */
export function createRepositoryStore() {
  // `auto_review_enabled` выключен, как в фикстуре настроек: настройки и репозиторий сходятся.
  const docs = registered(installation[1], 2, '2026-09-22T14:15:00Z')
  docs.repo.auto_review_enabled = false
  let records: Registered[] = [
    registered(installation[0], 1, '2026-09-20T10:00:00Z'),
    docs,
    // Сценарий «файл правил есть, но применимых правил нет» (repositorySettings).
    registered(installation[4], 3, '2026-09-25T09:00:00Z'),
    // Ревью выключили: `id` есть, настройки и история открываются.
    registered(installation[5], 4, '2026-09-26T09:00:00Z', null),
  ]
  const recordOf = (source: InstallationRepository) =>
    records.find(
      ({ repo }) => repo.provider === source.provider && repo.provider_id === source.provider_id,
    )
  const recordById = (repositoryId: string) => records.find(({ repo }) => repo.id === repositoryId)

  return {
    list: (): RepositoryList => ({
      items: installation
        .map((source): RepositoryListItem => {
          const record = recordOf(source)
          return {
            ...source,
            connected: record?.connectedAt != null,
            id: record?.repo.id ?? null,
            connected_at: record?.connectedAt ?? null,
          }
        })
        .sort((a, b) => a.full_name.toLowerCase().localeCompare(b.full_name.toLowerCase())),
      install_url: MOCK_INSTALL_URL,
    }),
    /** Репозиторий с записью по id — граница блока настроек (#29), в том числе выключенный. */
    find: (repositoryId: string) => recordById(repositoryId)?.repo,
    /** Один репозиторий `GET /repositories/{id}`: как бэкенд, 404 для чужого id. */
    get: (repositoryId: string): Repository => {
      const record = recordById(repositoryId)
      if (!record) throw new ApiError(404, 'Репозиторий не найден', 'REPOSITORY_NOT_FOUND')
      return { ...record.repo }
    },
    /** Флаг авто-ревью — колонка репозитория: сохранение настроек меняет и её. */
    setAutoReviewEnabled: (repositoryId: string, enabled: boolean) => {
      records = records.map((record) =>
        record.repo.id === repositoryId
          ? { ...record, repo: { ...record.repo, auto_review_enabled: enabled } }
          : record,
      )
    },
    connect: ({ provider, provider_id }: ConnectRepositoryRequest): Repository => {
      const source = installation.find(
        (r) => r.provider === provider && r.provider_id === provider_id,
      )
      if (!source) {
        throw new ApiError(
          404,
          'Репозитория нет в установке GitHub App',
          'REPOSITORY_NOT_IN_INSTALLATION',
        )
      }
      if (!source.can_connect) {
        throw new ApiError(403, 'Нужна роль admin или maintain', 'REPOSITORY_MANAGE_REQUIRED')
      }
      const now = new Date().toISOString()
      const record = recordOf(source)
      if (record?.connectedAt != null) {
        throw new ApiError(409, 'Репозиторий уже подключён', 'REPOSITORY_ALREADY_CONNECTED')
      }
      // Выключенный включается обратно с прежним id: история остаётся.
      const next = record
        ? { ...record, connectedAt: now }
        : registered(source, records.length + 1, now)
      records = record ? records.map((r) => (r === record ? next : r)) : [...records, next]
      return { ...next.repo }
    },
    /** `DELETE /repositories/{id}`: `204` и для уже выключенного. */
    disconnect: (repositoryId: string): null => {
      const record = recordById(repositoryId)
      if (!record) throw new ApiError(404, 'Репозиторий не найден', 'REPOSITORY_NOT_FOUND')
      const source = installation.find((r) => r.provider_id === record.repo.provider_id)
      if (!source?.can_connect) {
        throw new ApiError(403, 'Нужна роль admin или maintain', 'REPOSITORY_MANAGE_REQUIRED')
      }
      records = records.map((r) => (r === record ? { ...r, connectedAt: null } : r))
      return null
    },
  }
}
