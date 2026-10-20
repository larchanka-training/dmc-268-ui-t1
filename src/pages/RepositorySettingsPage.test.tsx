import { describe, expect, it } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { HistoryRun, Repository, RepositorySettings, RulesStatus } from '@/entities/repository'
import { repositoryKeys } from '@/features/repository'
import type { ApiTransport } from '@/shared/api'
import { renderWithTransport } from '@/test/api'
import { RepositorySettingsPage } from './RepositorySettingsPage'

/**
 * Управляемый бэкенд теста: записи можно менять до рендера и между рефетчами, `failures`
 * роняет один блок, `badShape` отвечает данными вне схемы, `beforeSave` держит сохранение,
 * пока тест не отпустит.
 */
type Backend = {
  repositories: Repository[]
  settings: Record<string, RepositorySettings>
  rules: Record<string, RulesStatus>
  history: Record<string, HistoryRun[]>
  failures: { repositories?: Error; settings?: Error; rules?: Error; history?: Error; save?: Error }
  badShape: { settings?: unknown; rules?: unknown; history?: unknown }
  beforeSave?: () => Promise<void>
}

const DEFAULT_SETTINGS: RepositorySettings = {
  autoReviewEnabled: true,
  branchFilter: [],
  minSeverity: 'critical',
}

function repository(n: number, full_name: string): Repository {
  return {
    id: `repo-${n}`,
    provider: 'github',
    provider_id: String(100 + n),
    full_name,
    default_branch: 'main',
    auto_review_enabled: true,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  }
}

const RULES_PATH = '.review/rules.md'

function createBackend(): Backend {
  return {
    repositories: [
      repository(1, 'larchanka-training/platform-api'),
      repository(2, 'larchanka-training/docs'),
      repository(3, 'larchanka-training/design-system'),
    ],
    settings: {
      'repo-1': {
        autoReviewEnabled: true,
        branchFilter: ['feature/**', 'fix/**'],
        minSeverity: 'high',
      },
      'repo-2': { autoReviewEnabled: false, branchFilter: ['docs/**'], minSeverity: 'critical' },
    },
    rules: {
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
            checks: [
              'Не допускать N+1 запросов в циклах',
              'Проверять индексы под новые SQL-запросы',
            ],
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
      'repo-2': { status: 'absent', branch: 'main', path: RULES_PATH },
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
    },
    history: {
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
      ],
      'repo-2': [],
    },
    failures: {},
    badShape: {},
  }
}

/** Транспорт поверх бэкенда теста: те же пути, что у entity api. */
function backendTransport(backend: Backend): ApiTransport {
  const get = async (path: string): Promise<unknown> => {
    if (path === '/repositories?limit=200') {
      if (backend.failures.repositories) throw backend.failures.repositories
      return { items: backend.repositories }
    }
    const settingsRoute = /^\/repositories\/([^/]+)\/settings$/.exec(path)
    if (settingsRoute) {
      if (backend.failures.settings) throw backend.failures.settings
      if (backend.badShape.settings !== undefined) return structuredClone(backend.badShape.settings)
      return structuredClone(backend.settings[settingsRoute[1]] ?? DEFAULT_SETTINGS)
    }
    const rulesRoute = /^\/repositories\/([^/]+)\/rules$/.exec(path)
    if (rulesRoute) {
      if (backend.failures.rules) throw backend.failures.rules
      if (backend.badShape.rules !== undefined) return structuredClone(backend.badShape.rules)
      return structuredClone(
        backend.rules[rulesRoute[1]] ?? {
          status: 'absent',
          branch: 'main',
          path: RULES_PATH,
        },
      )
    }
    const historyRoute = /^\/repositories\/([^/]+)\/history$/.exec(path)
    if (historyRoute) {
      if (backend.failures.history) throw backend.failures.history
      if (backend.badShape.history !== undefined) return structuredClone(backend.badShape.history)
      return structuredClone(backend.history[historyRoute[1]] ?? [])
    }
    throw new Error(`неожиданный запрос ${path}`)
  }

  const post = async (path: string, body: unknown): Promise<unknown> => {
    const settingsRoute = /^\/repositories\/([^/]+)\/settings$/.exec(path)
    if (settingsRoute) {
      if (backend.failures.save) throw backend.failures.save
      await backend.beforeSave?.()
      const draft = structuredClone(body) as RepositorySettings
      backend.settings[settingsRoute[1]] = draft
      return structuredClone(draft)
    }
    throw new Error(`неожиданный запрос ${path}`)
  }

  return { get, post }
}

function deferred() {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function renderSettingsPage(repositoryId = 'repo-1', backend = createBackend()) {
  const utils = renderWithTransport(
    <MemoryRouter initialEntries={[`/repositories/${repositoryId}/settings`]}>
      <Routes>
        <Route path="/repositories/:repositoryId/settings" element={<RepositorySettingsPage />} />
        {/* Заглушка экрана прогона: проверяем только переход по ссылке. */}
        <Route path="/reviews/:reviewId" element={<div>Экран прогона</div>} />
      </Routes>
    </MemoryRouter>,
    backendTransport(backend),
  )
  return { ...utils, backend }
}

describe('RepositorySettingsPage: загрузка', () => {
  it('форма показывает сохранённые значения repo-1', async () => {
    renderSettingsPage()

    expect(await screen.findByRole('switch')).toBeChecked()
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked()
    expect(screen.getByText('feature/**')).toBeInTheDocument()
    expect(screen.getByText('fix/**')).toBeInTheDocument()
  })

  it('репозиторий не найден: сообщение и путь назад, а не пустая страница', async () => {
    renderSettingsPage('repo-nope')

    expect(await screen.findByText('Репозиторий не найден')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'К списку репозиториев' })).toHaveAttribute(
      'href',
      '/repositories',
    )
  })
})

describe('RepositorySettingsPage: сохранение настроек', () => {
  it('успех: форма и данные показывают новые значения', async () => {
    const user = userEvent.setup()
    const backend = createBackend()
    const { unmount } = renderSettingsPage('repo-1', backend)

    await screen.findByRole('switch')
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()
    expect(backend.settings['repo-1']?.autoReviewEnabled).toBe(false)

    // Новый заход на экран читает уже сохранённые значения.
    unmount()
    renderSettingsPage('repo-1', backend)
    expect(await screen.findByRole('switch')).not.toBeChecked()
  })

  it('ошибка: черновик остаётся в форме, бэкенд не меняется', async () => {
    const user = userEvent.setup()
    const { backend } = renderSettingsPage()
    backend.failures.save = new Error('Сеть недоступна')

    await screen.findByRole('switch')
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Не удалось сохранить настройки')).toBeInTheDocument()
    expect(screen.getByText('Сеть недоступна')).toBeInTheDocument()
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(backend.settings['repo-1']?.autoReviewEnabled).toBe(true)
  })

  it('поля заблокированы на время сохранения, после успеха форма совпадает с бэкендом', async () => {
    const user = userEvent.setup()
    const gate = deferred()
    const { backend } = renderSettingsPage()
    backend.beforeSave = () => gate.promise

    await screen.findByRole('switch')
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    // Сохранение в полёте (бэкенд молчит, пока тест не отпустит): правка невозможна.
    await waitFor(() => expect(screen.getByRole('switch')).toBeDisabled())
    expect(screen.getByRole('radio', { name: 'Low' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Сбросить' })).toBeDisabled()
    expect(screen.queryByText('Настройки сохранены')).not.toBeInTheDocument()

    gate.release()
    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()
    expect(screen.getByRole('switch')).not.toBeDisabled()
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(backend.settings['repo-1']?.autoReviewEnabled).toBe(false)
  })

  it('сброс возвращает сохранённые значения', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    expect(await screen.findByRole('switch')).toBeChecked()
    await user.click(screen.getByRole('switch'))
    // Radio-кнопка antd прячет input от указателя — клик идёт по подписи.
    await user.click(screen.getByText('Critical'))
    expect(screen.getByRole('switch')).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Сбросить' }))

    expect(screen.getByRole('switch')).toBeChecked()
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked()
  })

  it('сброс после правок убирает баннер «Настройки сохранены»', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    await screen.findByRole('switch')
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()

    // Правка скрывает баннер, сброс не должен возвращать его над откатанной формой.
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Сбросить' }))

    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(screen.queryByText('Настройки сохранены')).not.toBeInTheDocument()
  })

  it('сброс после ошибки сохранения убирает её баннер', async () => {
    const user = userEvent.setup()
    const { backend } = renderSettingsPage()
    backend.failures.save = new Error('Сеть недоступна')

    await screen.findByRole('switch')
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Не удалось сохранить настройки')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Сбросить' }))

    expect(screen.getByRole('switch')).toBeChecked()
    expect(screen.queryByText('Не удалось сохранить настройки')).not.toBeInTheDocument()
  })
})

describe('RepositorySettingsPage: статус правил', () => {
  it('repo-1: бейдж кастомных правил, превью правил и отклонённый раздел', async () => {
    renderSettingsPage()

    expect(await screen.findByText('Кастомные правила')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Performance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Style' })).toBeInTheDocument()
    // Чип паттерна повторяется у каждого правила с этим паттерном (Security и Performance).
    expect(screen.getAllByText('pattern: app/**/*.py')).toHaveLength(2)
    expect(screen.getByText('Docs — нет паттерна (pattern); нет проверок')).toBeInTheDocument()
  })

  it('repo-2: предупреждение о дефолтных правилах', async () => {
    renderSettingsPage('repo-2')

    expect(await screen.findByText('Дефолтные правила')).toBeInTheDocument()
    expect(screen.getByText(/Используются дефолтные правила/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Security' })).not.toBeInTheDocument()
  })

  it('repo-3: файл без применимых правил — не кастомные, отклонённые разделы видны', async () => {
    renderSettingsPage('repo-3')

    expect(await screen.findByText('Правила не применяются')).toBeInTheDocument()
    expect(screen.queryByText('Кастомные правила')).not.toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/ревью идёт по стандартным критериям/)
    expect(screen.getByText('Docs — нет паттерна (pattern); нет проверок')).toBeInTheDocument()
    expect(screen.getByText('A11y — нет паттерна (pattern)')).toBeInTheDocument()
  })
})

describe('RepositorySettingsPage: история проверок', () => {
  it('выбор прогона открывает экран его просмотра', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    const runLink = await screen.findByRole('link', { name: 'Чтение токена из окружения' })
    expect(runLink).toHaveAttribute('href', '/reviews/run-42')
    await user.click(runLink)

    expect(await screen.findByText('Экран прогона')).toBeInTheDocument()
  })

  it('repo-2: проверок ещё не было', async () => {
    renderSettingsPage('repo-2')

    expect(await screen.findByText('Проверок ещё не было')).toBeInTheDocument()
  })

  it('незнакомый статус прогона показывается как есть и не ломает список', async () => {
    const backend = createBackend()
    backend.history['repo-1'] = [
      {
        id: 'run-99',
        number: 99,
        title: 'Ребейз поверх develop',
        sourceBranch: 'feat/rebase',
        status: 'rebasing',
        createdAt: '2026-10-10T10:00:00Z',
      },
    ]
    renderSettingsPage('repo-1', backend)

    expect(await screen.findByText('rebasing')).toBeInTheDocument()
    expect(screen.getByText('Ребейз поверх develop')).toBeInTheDocument()
    // Время — одним форматтером с экраном прогона: Intl, UTC.
    expect(screen.getByText('10.10.2026, 10:00 UTC')).toBeInTheDocument()
  })
})

describe('RepositorySettingsPage: состояния данных', () => {
  it('ошибка одного блока не ломает остальные, повтор чинит блок', async () => {
    const user = userEvent.setup()
    const { backend } = renderSettingsPage()
    backend.failures.rules = new Error('rules boom')

    expect(await screen.findByText('Не удалось загрузить статус правил')).toBeInTheDocument()
    expect(await screen.findByText('rules boom')).toBeInTheDocument()
    // Настройки и история работают.
    expect(await screen.findByRole('switch')).toBeChecked()
    expect(await screen.findByText('Чтение токена из окружения')).toBeInTheDocument()

    // Чиним бэкенд и повторяем запрос блока.
    delete backend.failures.rules
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('Кастомные правила')).toBeInTheDocument()
  })

  it('данные вне схемы: каждый блок показывает ошибку контракта, экран не падает', async () => {
    const backend = createBackend()
    backend.badShape = {
      settings: { autoReviewEnabled: 'yes' },
      rules: { status: 'half-loaded' },
      history: [{ nope: true }],
    }
    renderSettingsPage('repo-1', backend)

    expect(await screen.findByText('Не удалось загрузить настройки')).toBeInTheDocument()
    expect(await screen.findByText('Не удалось загрузить статус правил')).toBeInTheDocument()
    expect(await screen.findByText('Не удалось загрузить историю проверок')).toBeInTheDocument()
    expect(screen.getAllByText(/не соответствует контракту/)).toHaveLength(3)
  })

  it('фоновая ошибка настроек: форма остаётся на данных из кэша, сверху Alert с повтором', async () => {
    const user = userEvent.setup()
    const { backend, client } = renderSettingsPage()

    expect(await screen.findByRole('switch')).toBeChecked()
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked()

    backend.failures.settings = new Error('settings boom')
    await act(() => client.invalidateQueries({ queryKey: repositoryKeys.settings('repo-1') }))

    expect(
      await screen.findByText('Не удалось обновить настройки — показаны сохранённые значения'),
    ).toBeInTheDocument()
    expect(screen.getByText('settings boom')).toBeInTheDocument()
    // Форма не заменена ошибкой: значения из кэша на месте.
    expect(screen.getByRole('switch')).toBeChecked()
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked()

    // Повтор с починенным бэкендом убирает Alert.
    delete backend.failures.settings
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() =>
      expect(screen.queryByText(/Не удалось обновить настройки/)).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('фоновая ошибка истории: таблица остаётся на данных из кэша, сверху Alert', async () => {
    const { backend, client } = renderSettingsPage()

    expect(await screen.findByText('Чтение токена из окружения')).toBeInTheDocument()

    backend.failures.history = new Error('history boom')
    await act(() => client.invalidateQueries({ queryKey: repositoryKeys.history('repo-1') }))

    expect(
      await screen.findByText(
        'Не удалось обновить историю проверок — показана последняя загруженная',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('history boom')).toBeInTheDocument()
    // Таблица с данными из кэша не заменена полной ошибкой.
    expect(screen.getByText('Чтение токена из окружения')).toBeInTheDocument()
  })
})
