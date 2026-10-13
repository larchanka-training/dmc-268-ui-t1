import type {
  HistoryRun,
  RepositorySettings,
  RulesStatus,
} from '@/entities/repository/model/settings'
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

const RULES_PATH = '.review/rules.md'

/** Настройки фикстур различаются, чтобы форма не выглядела константой (design.md). */
const settingsByRepo: Record<string, RepositorySettings> = {
  'repo-1': {
    autoReviewEnabled: true,
    branchFilter: ['feature/**', 'fix/**'],
    severityThreshold: 'warn_and_critical',
  },
  'repo-2': {
    autoReviewEnabled: false,
    branchFilter: ['docs/**'],
    severityThreshold: 'critical_only',
  },
}

/** У репозитория, подключённого после старта сессии, настроек ещё нет — отдаём дефолт. */
const DEFAULT_SETTINGS: RepositorySettings = {
  autoReviewEnabled: true,
  branchFilter: [],
  severityThreshold: 'all',
}

/**
 * Adapter отдаёт уже распарсенные правила в форме api#49 (раздел `##`, pattern/exclude,
 * нумерованные проверки): парсинг markdown — задача бэкенда. У repo-1 есть отклонённый
 * раздел — рендерим и его.
 */
const rulesStatusByRepo: Record<string, RulesStatus> = {
  'repo-1': {
    status: 'loaded',
    branch: 'main',
    path: RULES_PATH,
    rules: [
      {
        name: 'Security',
        patterns: ['app/**/*.py'],
        excludes: ['**/tests/**'],
        checks: [
          'Не хранить секреты и токены в коде',
          'Проверять новые зависимости на известные уязвимости',
        ],
      },
      {
        name: 'Performance',
        patterns: ['app/**/*.py', 'src/**/*.ts'],
        excludes: ['**/migrations/**'],
        checks: ['Не допускать N+1 запросов в циклах', 'Проверять индексы под новые SQL-запросы'],
      },
      {
        name: 'Style',
        patterns: ['src/**/*.{ts,tsx}'],
        excludes: ['**/*.generated.ts'],
        checks: ['Следовать правилам `.editorconfig` и eslint'],
      },
    ],
    rejected: [{ name: 'Docs', reason: 'нет паттерна (pattern); нет проверок' }],
    fetchedAt: '2026-10-11T09:40:00.000Z',
  },
  'repo-2': {
    status: 'absent',
    branch: 'main',
    path: RULES_PATH,
  },
}

/**
 * История `repo-1` покрывает все статусы прогона, включая незавершённые: mock должен
 * рендерить каждый бейдж. Новые сверху; id свежего completed-прогона совпадает с фикстурой
 * экрана `/reviews/run-42`.
 */
const historyByRepo: Record<string, HistoryRun[]> = {
  'repo-1': [
    {
      id: 'run-42',
      number: 42,
      title: 'Чтение токена из окружения',
      sourceBranch: 'feat/env-token',
      status: 'completed',
      createdAt: '2026-10-05T17:03:26Z',
    },
    {
      id: 'run-41',
      number: 41,
      title: 'Отмена прогона при деплое соседнего сервиса',
      sourceBranch: 'feat/bulk-export',
      status: 'cancelled',
      createdAt: '2026-10-04T12:10:00Z',
    },
    {
      id: 'run-40',
      number: 40,
      title: 'Кэширование ответов ручки /metrics',
      sourceBranch: 'fix/metrics-cache',
      status: 'failed',
      createdAt: '2026-10-03T09:45:00Z',
    },
    {
      id: 'run-39',
      number: 39,
      title: 'Индекс для таблицы findings',
      sourceBranch: 'feat/findings-index',
      status: 'publishing',
      createdAt: '2026-10-02T16:20:00Z',
    },
    {
      id: 'run-38',
      number: 38,
      title: 'Рефакторинг парсера диффа',
      sourceBranch: 'refactor/diff-parser',
      status: 'analysing',
      createdAt: '2026-10-01T11:05:00Z',
    },
    {
      id: 'run-37',
      number: 37,
      title: 'Правки миграции схемы отзывов',
      sourceBranch: 'fix/review-migration',
      status: 'building_context',
      createdAt: '2026-09-30T14:30:00Z',
    },
    {
      id: 'run-36',
      number: 36,
      title: 'Экспорт отчётов в CSV',
      sourceBranch: 'feat/csv-export',
      status: 'queued',
      createdAt: '2026-09-29T10:00:00Z',
    },
  ],
  'repo-2': [],
}

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

function requireConnectedRepo(repoId: string): ConnectedRepository {
  const repo = connectedRepos.find((r) => r.id === repoId)
  if (!repo) {
    throw new Error('Репозиторий не найден')
  }
  return repo
}

export function getRepositorySettings(repoId: string): RepositorySettings {
  requireConnectedRepo(repoId)
  const settings = settingsByRepo[repoId] ?? DEFAULT_SETTINGS
  // Копия, как после сети: потребитель не может мутировать фикстуры store.
  return structuredClone(settings)
}

export function getRulesStatus(repoId: string): RulesStatus {
  const repo = requireConnectedRepo(repoId)
  const status = rulesStatusByRepo[repoId]
  if (!status) {
    // У нового подключённого репозитория файла правил ещё нет — сценарий предупреждения.
    return { status: 'absent', branch: repo.defaultBranch, path: RULES_PATH }
  }
  return structuredClone(status)
}

export function getRepositoryHistory(repoId: string): HistoryRun[] {
  requireConnectedRepo(repoId)
  return structuredClone(historyByRepo[repoId] ?? [])
}

export function saveRepositorySettings(
  repoId: string,
  settings: RepositorySettings,
): RepositorySettings {
  requireConnectedRepo(repoId)
  settingsByRepo[repoId] = structuredClone(settings)
  return getRepositorySettings(repoId)
}
