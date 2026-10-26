import type {
  Repository,
  RepositorySettings,
  RepositorySettingsUpdate,
  RulesStatus,
} from '../../entities/repository'
import { ApiError } from '../../shared/api'
import { mockRepositoryId } from './repositories'

const RULES_PATH = '.review/rules.md'

/**
 * Фикстуры блока настроек. Ручки описаны в контракте (`GET/PUT …/settings`,
 * `GET …/rules`, заглушки 501, задача api#113), поэтому форма ответов — схема
 * `entities/repository/model/settings.ts` поле в поле с контрактом. Ручка отдаёт
 * уже распарсенные правила: парсинг markdown — задача бэкенда.
 */

/** Настройки фикстур различаются, чтобы форма не выглядела константой (design.md). */
const SETTINGS_BY_REPO: Record<string, RepositorySettings> = {
  [mockRepositoryId(1)]: {
    auto_review_enabled: true,
    branch_filter: ['feature/**', 'fix/**'],
    min_severity: 'high',
  },
  [mockRepositoryId(2)]: {
    auto_review_enabled: false,
    branch_filter: ['docs/**'],
    min_severity: 'critical',
  },
}

/** У репозитория, подключённого после старта сессии, настроек ещё нет — отдаём дефолт. */
const DEFAULT_SETTINGS: RepositorySettings = {
  auto_review_enabled: true,
  branch_filter: [],
  min_severity: 'critical',
}

/**
 * У первого репозитория есть отклонённый раздел — рендерим и его; у третьего файл разобран,
 * но ни один раздел не стал правилом — исход `empty`, сценарий «правила не применяются».
 */
const RULES_BY_REPO: Record<string, RulesStatus> = {
  [mockRepositoryId(1)]: {
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
    fetched_at: '2026-10-11T09:40:00.000Z',
  },
  [mockRepositoryId(2)]: {
    status: 'absent',
    branch: 'main',
    path: RULES_PATH,
  },
  [mockRepositoryId(3)]: {
    status: 'empty',
    branch: 'main',
    path: RULES_PATH,
    rejected: [
      { name: 'Docs', reason: 'нет паттерна (pattern); нет проверок' },
      { name: 'A11y', reason: 'нет паттерна (pattern)' },
    ],
    fetched_at: '2026-10-11T09:35:00.000Z',
  },
}

/**
 * Хранилище настроек и статуса `.review/rules.md` mock adapter'а. Отвечает только за
 * подключённые репозитории: чужой id — 404 `REPOSITORY_NOT_FOUND`, как у бэкенда.
 * Истории здесь нет: список прогонов репозитория — та же ручка `GET /reviews` с фильтром
 * `repository_id`, что и у вкладки «Ревью» (`reviewRuns.ts`).
 */
export function createRepositorySettingsStore({
  findRepository,
  onAutoReviewChange,
}: {
  findRepository: (repositoryId: string) => Repository | undefined
  /** Флаг авто-ревью — колонка репозитория: бэкенд обновил бы её тем же сохранением. */
  onAutoReviewChange?: (repositoryId: string, enabled: boolean) => void
}) {
  const settingsByRepo: Record<string, RepositorySettings> = structuredClone(SETTINGS_BY_REPO)

  const requireRepository = (repositoryId: string): Repository => {
    const repo = findRepository(repositoryId)
    if (!repo) throw new ApiError(404, 'Репозиторий не найден', 'REPOSITORY_NOT_FOUND')
    return repo
  }

  return {
    settings(repositoryId: string): RepositorySettings {
      requireRepository(repositoryId)
      // Копия, как после сети: потребитель не может мутировать фикстуры store.
      return structuredClone(settingsByRepo[repositoryId] ?? DEFAULT_SETTINGS)
    },

    saveSettings(repositoryId: string, draft: RepositorySettingsUpdate): RepositorySettings {
      requireRepository(repositoryId)
      settingsByRepo[repositoryId] = structuredClone(draft)
      onAutoReviewChange?.(repositoryId, draft.auto_review_enabled)
      return structuredClone(settingsByRepo[repositoryId])
    },

    rulesStatus(repositoryId: string): RulesStatus {
      const repo = requireRepository(repositoryId)
      const status = RULES_BY_REPO[repositoryId]
      if (status) return structuredClone(status)
      // У репозитория, подключённого после старта сессии, файла правил ещё нет.
      return { status: 'absent', branch: repo.default_branch, path: RULES_PATH }
    },
  }
}
