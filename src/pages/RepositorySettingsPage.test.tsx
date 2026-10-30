import { describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import type {
  Repository,
  RepositorySettings,
  RepositorySettingsUpdate,
  RulesStatus,
} from '@/entities/repository'
import { repositoryKeys } from '@/features/repository'
import { ApiError, ContractError } from '@/shared/api'
import { renderWithTransport } from '@/test/api'
import { RepositorySettingsPage } from './RepositorySettingsPage'

/**
 * Управляемый бэкенд теста: записи можно менять до рендера и между рефетчами, `failures`
 * роняет один блок, `badShape` отвечает данными вне схемы, `beforeSave` держит сохранение,
 * пока тест не отпустит. Ручки — как в контракте: `GET /repositories/{id}`,
 * `GET/PUT …/settings` и `GET …/rules`.
 */
type Backend = {
  repositories: Record<string, Repository>
  settings: Record<string, RepositorySettings>
  rules: Record<string, RulesStatus>
  failures: { repository?: Error; settings?: Error; rules?: Error; save?: Error }
  badShape: { settings?: unknown; rules?: unknown }
  beforeSave?: () => Promise<void>
}

const RULES_PATH = '.review/rules.md'

const DEFAULT_SETTINGS: RepositorySettings = {
  auto_review_enabled: true,
  branch_filter: [],
  min_severity: 'critical',
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

function createBackend(): Backend {
  return {
    repositories: {
      'repo-1': repository(1, 'larchanka-training/platform-api'),
      'repo-2': repository(2, 'larchanka-training/docs'),
      'repo-3': repository(3, 'larchanka-training/design-system'),
    },
    settings: {
      'repo-1': {
        auto_review_enabled: true,
        branch_filter: ['feature/**', 'fix/**'],
        min_severity: 'high',
      },
      'repo-2': {
        auto_review_enabled: false,
        branch_filter: ['docs/**'],
        min_severity: 'critical',
      },
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
        fetched_at: '2026-10-11T09:40:00.000Z',
      },
      'repo-2': { status: 'absent', branch: 'main', path: RULES_PATH },
      // Файл разобран, но ни один раздел не стал правилом — исход `empty` контракта.
      'repo-3': {
        status: 'empty',
        branch: 'main',
        path: RULES_PATH,
        rejected: [
          { name: 'Docs', reason: 'нет паттерна (pattern); нет проверок' },
          { name: 'A11y', reason: 'нет паттерна (pattern)' },
        ],
        fetched_at: '2026-10-11T09:35:00.000Z',
      },
    },
    failures: {},
    badShape: {},
  }
}

/** Транспорт поверх бэкенда теста: те же ручки, что в контракте; вызовы — шпионы. */
function backendTransport(backend: Backend) {
  const get = vi.fn(async (path: string): Promise<unknown> => {
    const [route] = path.split('?')
    const repositoryRoute = /^\/repositories\/([^/]+)$/.exec(route)
    if (repositoryRoute) {
      if (backend.failures.repository) throw backend.failures.repository
      const repo = backend.repositories[repositoryRoute[1]]
      if (!repo) throw new ApiError(404, 'Репозиторий не найден', 'REPOSITORY_NOT_FOUND')
      return structuredClone(repo)
    }
    const settingsRoute = /^\/repositories\/([^/]+)\/settings$/.exec(route)
    if (settingsRoute) {
      if (backend.failures.settings) throw backend.failures.settings
      if (backend.badShape.settings !== undefined) return structuredClone(backend.badShape.settings)
      return structuredClone(backend.settings[settingsRoute[1]] ?? DEFAULT_SETTINGS)
    }
    const rulesRoute = /^\/repositories\/([^/]+)\/rules$/.exec(route)
    if (rulesRoute) {
      if (backend.failures.rules) throw backend.failures.rules
      if (backend.badShape.rules !== undefined) return structuredClone(backend.badShape.rules)
      return structuredClone(
        backend.rules[rulesRoute[1]] ?? { status: 'absent', branch: 'main', path: RULES_PATH },
      )
    }
    throw new Error(`неожиданный запрос GET ${path}`)
  })

  const put = vi.fn(async (path: string, body: unknown): Promise<unknown> => {
    const settingsRoute = /^\/repositories\/([^/]+)\/settings$/.exec(path)
    if (!settingsRoute) throw new Error(`неожиданный запрос PUT ${path}`)
    if (backend.failures.save) throw backend.failures.save
    await backend.beforeSave?.()
    const draft = structuredClone(body) as RepositorySettingsUpdate
    backend.settings[settingsRoute[1]] = draft
    return structuredClone(draft)
  })

  const post = vi.fn(async (path: string): Promise<unknown> => {
    throw new Error(`неожиданный запрос POST ${path}`)
  })

  const del = vi.fn(async (path: string): Promise<unknown> => {
    throw new Error(`неожиданный запрос DELETE ${path}`)
  })

  return { get, put, post, delete: del }
}

function deferred() {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function renderSettingsPage(repositoryId = 'repo-1', backend = createBackend(), extra?: ReactNode) {
  const transport = backendTransport(backend)
  const utils = renderWithTransport(
    <MemoryRouter initialEntries={[`/repositories/${repositoryId}/settings`]}>
      {extra}
      <Routes>
        <Route path="/repositories/:repositoryId/settings" element={<RepositorySettingsPage />} />
      </Routes>
    </MemoryRouter>,
    transport,
  )
  return { ...utils, backend, transport }
}

describe('RepositorySettingsPage: загрузка', () => {
  it('форма показывает сохранённые значения repo-1', async () => {
    renderSettingsPage()

    expect(await screen.findByRole('radio', { name: 'High' })).toBeChecked()
    expect(screen.getByText('feature/**')).toBeInTheDocument()
    expect(screen.getByText('fix/**')).toBeInTheDocument()
    // A11y: группа радиокнопок порога severity имеет имя (замечание ревью).
    expect(screen.getByRole('radiogroup', { name: 'Порог severity' })).toBeInTheDocument()
  })

  it('репозиторий не найден: Result с путём назад, а не пустая страница', async () => {
    renderSettingsPage('repo-nope')

    expect(await screen.findByText('Репозиторий не найден')).toBeInTheDocument()
    expect(
      screen.getByText('Репозитория с таким адресом нет среди подключённых.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'К списку репозиториев' })).toHaveAttribute(
      'href',
      '/repositories',
    )
  })

  it('422 на не-uuid идентификатор — тоже «Репозиторий не найден», как 404', async () => {
    const backend = createBackend()
    backend.failures.repository = new ApiError(422, 'repository_id: не uuid', 'VALIDATION_ERROR')
    renderSettingsPage('repo-1', backend)

    expect(await screen.findByText('Репозиторий не найден')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('тулбар ведёт на вкладку «Ревью» с фильтром по этому репозиторию', async () => {
    renderSettingsPage('repo-1')

    expect(await screen.findByRole('radio', { name: 'High' })).toBeChecked()
    const runsLink = screen.getByRole('link', { name: 'Прогоны репозитория' })
    expect(runsLink).toHaveAttribute('href', '/reviews?repository_id=repo-1')
  })
})

describe('RepositorySettingsPage: сохранение настроек', () => {
  it('сохранение уходит PUT-ом с телом настроек, POST не используется', async () => {
    const user = userEvent.setup()
    const { transport } = renderSettingsPage()

    await screen.findByRole('radio', { name: 'High' })
    // Radio-кнопка antd прячет input от указателя — клик идёт по подписи.
    await user.click(screen.getByText('Low'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()
    expect(transport.put).toHaveBeenCalledTimes(1)
    expect(transport.put).toHaveBeenCalledWith('/repositories/repo-1/settings', {
      auto_review_enabled: true,
      branch_filter: ['feature/**', 'fix/**'],
      min_severity: 'low',
    })
    expect(transport.post).not.toHaveBeenCalled()
  })

  it('успех: форма и данные показывают новые значения', async () => {
    const user = userEvent.setup()
    const backend = createBackend()
    const { unmount } = renderSettingsPage('repo-1', backend)

    await screen.findByRole('radio', { name: 'High' })
    await user.click(screen.getByText('Low'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()
    expect(backend.settings['repo-1']?.min_severity).toBe('low')

    // Новый заход на экран читает уже сохранённые значения.
    unmount()
    renderSettingsPage('repo-1', backend)
    expect(await screen.findByRole('radio', { name: 'Low' })).toBeChecked()
  })

  it('ошибка: черновик остаётся в форме, бэкенд не меняется', async () => {
    const user = userEvent.setup()
    const { backend } = renderSettingsPage()
    backend.failures.save = new Error('Сеть недоступна')

    await screen.findByRole('radio', { name: 'High' })
    await user.click(screen.getByText('Low'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Не удалось сохранить настройки')).toBeInTheDocument()
    expect(screen.getByText('Сеть недоступна')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Low' })).toBeChecked()
    expect(backend.settings['repo-1']?.min_severity).toBe('high')
  })

  it('поля заблокированы на время сохранения, после успеха форма совпадает с бэкендом', async () => {
    const user = userEvent.setup()
    const gate = deferred()
    const { backend } = renderSettingsPage()
    backend.beforeSave = () => gate.promise

    await screen.findByRole('radio', { name: 'High' })
    await user.click(screen.getByText('Low'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    // Сохранение в полёте (бэкенд молчит, пока тест не отпустит): правка невозможна.
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Medium' })).toBeDisabled())
    expect(screen.getByRole('radio', { name: 'Low' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Сбросить' })).toBeDisabled()
    expect(screen.queryByText('Настройки сохранены')).not.toBeInTheDocument()

    gate.release()
    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Low' })).not.toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Low' })).toBeChecked()
    expect(backend.settings['repo-1']?.min_severity).toBe('low')
  })

  it('сброс возвращает сохранённые значения', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    expect(await screen.findByRole('radio', { name: 'High' })).toBeChecked()
    // Radio-кнопка antd прячет input от указателя — клик идёт по подписи.
    await user.click(screen.getByText('Critical'))
    expect(screen.getByRole('radio', { name: 'Critical' })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Сбросить' }))

    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Critical' })).not.toBeChecked()
  })

  it('сброс после правок убирает баннер «Настройки сохранены»', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    await screen.findByRole('radio', { name: 'High' })
    await user.click(screen.getByText('Low'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()

    // Правка скрывает баннер, сброс не должен возвращать его над откатанной формой.
    await user.click(screen.getByText('Critical'))
    await user.click(screen.getByRole('button', { name: 'Сбросить' }))

    expect(screen.getByRole('radio', { name: 'Low' })).toBeChecked()
    expect(screen.queryByText('Настройки сохранены')).not.toBeInTheDocument()
  })

  it('сброс после ошибки сохранения убирает её баннер', async () => {
    const user = userEvent.setup()
    const { backend } = renderSettingsPage()
    backend.failures.save = new Error('Сеть недоступна')

    await screen.findByRole('radio', { name: 'High' })
    await user.click(screen.getByText('Low'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Не удалось сохранить настройки')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Сбросить' }))

    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked()
    expect(screen.queryByText('Не удалось сохранить настройки')).not.toBeInTheDocument()
  })

  it('нормализация фильтра веток: пробелы и повторы не уходят в сохранение', async () => {
    const user = userEvent.setup()
    const { transport } = renderSettingsPage()

    const input = await screen.findByRole('combobox', { name: 'Фильтр веток' })
    await user.click(input)
    // Токен с пробелами попадает в форму как есть, повтор — отдельным тегом.
    await user.type(input, ' feature/* ,')
    await user.type(input, 'feature/*{enter}')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()
    // Трим и дедуп — на клиенте: грязный ввод не покидает клиент.
    expect(transport.put).toHaveBeenCalledWith('/repositories/repo-1/settings', {
      auto_review_enabled: true,
      branch_filter: ['feature/**', 'fix/**', 'feature/*'],
      min_severity: 'high',
    })
  })

  it('упавший рефетч после сохранения не откатывает форму к прежним значениям', async () => {
    const user = userEvent.setup()
    const { backend } = renderSettingsPage()
    await screen.findByRole('radio', { name: 'High' })

    // Сохранение пройдёт, а следующий за ним рефетч настроек упадёт.
    backend.failures.settings = new Error('settings boom')
    await user.click(screen.getByText('Low'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()
    expect(
      await screen.findByText('Не удалось обновить настройки — показаны сохранённые значения'),
    ).toBeInTheDocument()
    expect(screen.getByText('settings boom')).toBeInTheDocument()
    // Форма остаётся на новых значениях, ошибка — неблокирующая.
    expect(screen.getByRole('radio', { name: 'Low' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'High' })).not.toBeChecked()
  })
})

describe('RepositorySettingsPage: авто-ревью', () => {
  it('свитчера «Авто-ревью» нет, сохранение отправляет флаг как был сохранён', async () => {
    const user = userEvent.setup()
    const { transport } = renderSettingsPage('repo-2')

    await screen.findByRole('radio', { name: 'Critical' })
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByText('Авто-ревью')).not.toBeInTheDocument()

    await user.click(screen.getByText('Low'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()
    expect(transport.put).toHaveBeenCalledWith('/repositories/repo-2/settings', {
      auto_review_enabled: false,
      branch_filter: ['docs/**'],
      min_severity: 'low',
    })
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

  it('repo-3: исход empty — правила не применяются, отклонённые разделы видны', async () => {
    renderSettingsPage('repo-3')

    expect(await screen.findByText('Правила не применяются')).toBeInTheDocument()
    expect(screen.queryByText('Кастомные правила')).not.toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/ревью идёт по стандартным критериям/)
    expect(screen.getByText('Docs — нет паттерна (pattern); нет проверок')).toBeInTheDocument()
    expect(screen.getByText('A11y — нет паттерна (pattern)')).toBeInTheDocument()
  })
})

describe('RepositorySettingsPage: 501 от ручек-заглушек', () => {
  const notImplemented = () => new ApiError(501, 'Не реализовано', 'NOT_IMPLEMENTED')

  it.each([
    {
      block: 'настройки',
      fail: (backend: Backend) => {
        backend.failures.settings = notImplemented()
      },
      note: 'Настройки ревью пока недоступны',
      alive: async () => {
        expect(await screen.findByText('Кастомные правила')).toBeInTheDocument()
      },
    },
    {
      block: 'статус правил',
      fail: (backend: Backend) => {
        backend.failures.rules = notImplemented()
      },
      note: 'Статус правил пока недоступен',
      alive: async () => {
        expect(await screen.findByRole('radio', { name: 'High' })).toBeChecked()
      },
    },
  ])(
    '$block: «пока недоступно», а не ошибка, остальные блоки живы',
    async ({ fail, note, alive }) => {
      const backend = createBackend()
      fail(backend)
      renderSettingsPage('repo-1', backend)

      expect(await screen.findByText(note)).toBeInTheDocument()
      expect(screen.getByText(/отвечает заглушкой 501/)).toBeInTheDocument()
      expect(screen.queryByText(/Не удалось загрузить/)).not.toBeInTheDocument()
      await alive()
    },
  )
})

describe('RepositorySettingsPage: черновик', () => {
  it('черновик не переезжает при смене репозитория', async () => {
    const user = userEvent.setup()
    const link = <Link to="/repositories/repo-2/settings">Настройки repo-2</Link>
    renderSettingsPage('repo-1', createBackend(), link)

    expect(await screen.findByRole('radio', { name: 'High' })).toBeChecked()
    // Черновик repo-1: порог занижен.
    await user.click(screen.getByText('Low'))

    await user.click(screen.getByRole('link', { name: 'Настройки repo-2' }))

    // Форма repo-2 показывает сохранённые значения repo-2, а не черновик repo-1.
    expect(await screen.findByText('larchanka-training/docs')).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: 'Critical' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Low' })).not.toBeChecked()
    expect(screen.getByText('docs/**')).toBeInTheDocument()
  })
})

describe('RepositorySettingsPage: состояния данных', () => {
  it('ошибка одного блока не ломает остальные, повтор чинит блок', async () => {
    const user = userEvent.setup()
    const { backend } = renderSettingsPage()
    backend.failures.rules = new Error('rules boom')

    expect(await screen.findByText('Не удалось загрузить статус правил')).toBeInTheDocument()
    expect(await screen.findByText('rules boom')).toBeInTheDocument()
    // Настройки продолжают работать.
    expect(await screen.findByRole('radio', { name: 'High' })).toBeChecked()

    // Чиним бэкенд и повторяем запрос блока.
    delete backend.failures.rules
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('Кастомные правила')).toBeInTheDocument()
  })

  it('клиентская ошибка 4xx: блок показывает ошибку без кнопки «Повторить», остальные живы', async () => {
    const { backend } = renderSettingsPage()
    backend.failures.rules = new ApiError(404, 'Файл правил не найден', 'REPOSITORY_NOT_FOUND')

    expect(await screen.findByText('Не удалось загрузить статус правил')).toBeInTheDocument()
    expect(await screen.findByText('Файл правил не найден')).toBeInTheDocument()
    // 4xx повтор не изменит — кнопки повтора в блоке нет.
    expect(screen.queryByRole('button', { name: /Повторить/ })).not.toBeInTheDocument()
    // Настройки продолжают работать.
    expect(await screen.findByRole('radio', { name: 'High' })).toBeChecked()
  })

  it('429 — повтор имеет смысл: кнопка «Повторить» есть', async () => {
    const backend = createBackend()
    backend.failures.rules = new ApiError(429, 'Слишком много запросов', 'RATE_LIMITED')
    renderSettingsPage('repo-1', backend)

    expect(await screen.findByText('Не удалось загрузить статус правил')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Повторить/ })).toBeInTheDocument()
  })

  it('ContractError повтор не изменит: кнопки «Повторить» нет', async () => {
    const backend = createBackend()
    backend.failures.rules = new ContractError('/repositories/repo-1/rules', 'поле отсутствует')
    renderSettingsPage('repo-1', backend)

    expect(await screen.findByText('Не удалось загрузить статус правил')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Повторить/ })).not.toBeInTheDocument()
  })

  it('репозиторий отключили, пока настройки открыты: фоновый рефетч с 404 показывает «не найден», а не ошибку обновления', async () => {
    const { backend, queryClient } = renderSettingsPage()

    expect(await screen.findByRole('radio', { name: 'High' })).toBeChecked()

    backend.failures.repository = new ApiError(404, 'Репозиторий не найден', 'REPOSITORY_NOT_FOUND')
    await act(() =>
      queryClient.invalidateQueries({ queryKey: repositoryKeys.repository('repo-1') }),
    )

    expect(await screen.findByText('Репозиторий не найден')).toBeInTheDocument()
    // Блоки и форма скрыты: данных больше нет.
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('данные вне схемы: каждый блок показывает ошибку контракта, экран не падает', async () => {
    const backend = createBackend()
    backend.badShape = {
      settings: { auto_review_enabled: 'yes' },
      rules: { status: 'half-loaded' },
    }
    renderSettingsPage('repo-1', backend)

    expect(await screen.findByText('Не удалось загрузить настройки')).toBeInTheDocument()
    expect(await screen.findByText('Не удалось загрузить статус правил')).toBeInTheDocument()
    expect(screen.getAllByText(/не соответствует контракту/)).toHaveLength(2)
  })

  it('фоновая ошибка настроек: форма остаётся на данных из кэша, сверху Alert с повтором', async () => {
    const user = userEvent.setup()
    const { backend, queryClient } = renderSettingsPage()

    expect(await screen.findByRole('radio', { name: 'High' })).toBeChecked()

    backend.failures.settings = new Error('settings boom')
    await act(() => queryClient.invalidateQueries({ queryKey: repositoryKeys.settings('repo-1') }))

    expect(
      await screen.findByText('Не удалось обновить настройки — показаны сохранённые значения'),
    ).toBeInTheDocument()
    expect(screen.getByText('settings boom')).toBeInTheDocument()
    // Форма не заменена ошибкой: значения из кэша на месте.
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked()

    // Повтор с починенным бэкендом убирает Alert.
    delete backend.failures.settings
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() =>
      expect(screen.queryByText(/Не удалось обновить настройки/)).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked()
  })

  it('фоновая ошибка правил: панель остаётся на данных из кэша, сверху Alert с повтором', async () => {
    const user = userEvent.setup()
    const { backend, queryClient } = renderSettingsPage()

    expect(await screen.findByText('Кастомные правила')).toBeInTheDocument()

    backend.failures.rules = new Error('rules boom')
    await act(() => queryClient.invalidateQueries({ queryKey: repositoryKeys.rules('repo-1') }))

    expect(
      await screen.findByText('Не удалось обновить статус правил — показан последний загруженный'),
    ).toBeInTheDocument()
    expect(screen.getByText('rules boom')).toBeInTheDocument()
    // Бейдж и превью из кэша на месте.
    expect(screen.getByText('Кастомные правила')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()

    // Повтор с починенным бэкендом убирает Alert.
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
    delete backend.failures.rules
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() =>
      expect(screen.queryByText(/Не удалось обновить статус правил/)).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()
  })
})
