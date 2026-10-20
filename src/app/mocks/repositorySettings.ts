import type {
  HistoryRun,
  Repository,
  RepositorySettings,
  RulesStatus,
} from '../../entities/repository'
import { ApiError } from '../../shared/api'

const RULES_PATH = '.review/rules.md'

/**
 * Фикстуры блока настроек. Ручек в контракте бэкенда ещё нет (#28, домен api#49), поэтому
 * форма ответов закреплена схемами `entities/repository/model/settings.ts`. Adapter отдаёт
 * уже распарсенные правила в форме api#49: парсинг markdown — задача бэкенда.
 */

/** Настройки фикстур различаются, чтобы форма не выглядела константой (design.md). */
const SETTINGS_BY_REPO: Record<string, RepositorySettings> = {
  'repo-1': {
    autoReviewEnabled: true,
    branchFilter: ['feature/**', 'fix/**'],
    minSeverity: 'high',
  },
  'repo-2': {
    autoReviewEnabled: false,
    branchFilter: ['docs/**'],
    minSeverity: 'critical',
  },
}

/** У репозитория, подключённого после старта сессии, настроек ещё нет — отдаём дефолт. */
const DEFAULT_SETTINGS: RepositorySettings = {
  autoReviewEnabled: true,
  branchFilter: [],
  minSeverity: 'critical',
}

/**
 * У repo-1 есть отклонённый раздел — рендерим и его; у repo-3 файл есть, но применимых
 * правил нет — оба раздела отклонены, сценарий «правила не применяются».
 */
const RULES_BY_REPO: Record<string, RulesStatus> = {
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
  'repo-3': {
    status: 'loaded',
    branch: 'main',
    path: RULES_PATH,
    rules: [],
    rejected: [
      { name: 'Docs', reason: 'нет паттерна (pattern); нет проверок' },
      { name: 'A11y', reason: 'нет паттерна (pattern)' },
    ],
    fetchedAt: '2026-10-11T09:35:00.000Z',
  },
}

/**
 * История `repo-1` покрывает все статусы прогона, включая незавершённые: mock должен
 * рендерить каждый бейдж. Новые сверху; id свежего completed-прогона совпадает с фикстурой
 * экрана `/reviews/run-42`.
 */
const HISTORY_BY_REPO: Record<string, HistoryRun[]> = {
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

/**
 * Хранилище настроек, статуса `.review/rules.md` и истории проверок mock adapter'а.
 * Отвечает только за подключённые репозитории: чужой id — 404, как у бэкенда.
 */
export function createRepositorySettingsStore({
  findRepository,
}: {
  findRepository: (repositoryId: string) => Repository | undefined
}) {
  const settingsByRepo: Record<string, RepositorySettings> = structuredClone(SETTINGS_BY_REPO)

  const requireRepository = (repositoryId: string): Repository => {
    const repo = findRepository(repositoryId)
    if (!repo) throw new ApiError(404, 'Репозиторий не найден', 'NOT_FOUND')
    return repo
  }

  return {
    settings(repositoryId: string): RepositorySettings {
      requireRepository(repositoryId)
      // Копия, как после сети: потребитель не может мутировать фикстуры store.
      return structuredClone(settingsByRepo[repositoryId] ?? DEFAULT_SETTINGS)
    },

    saveSettings(repositoryId: string, draft: RepositorySettings): RepositorySettings {
      requireRepository(repositoryId)
      settingsByRepo[repositoryId] = structuredClone(draft)
      return structuredClone(settingsByRepo[repositoryId])
    },

    rulesStatus(repositoryId: string): RulesStatus {
      const repo = requireRepository(repositoryId)
      const status = RULES_BY_REPO[repositoryId]
      if (status) return structuredClone(status)
      // У репозитория, подключённого после старта сессии, файла правил ещё нет.
      return { status: 'absent', branch: repo.default_branch, path: RULES_PATH }
    },

    history(repositoryId: string): HistoryRun[] {
      requireRepository(repositoryId)
      return structuredClone(HISTORY_BY_REPO[repositoryId] ?? [])
    },
  }
}
