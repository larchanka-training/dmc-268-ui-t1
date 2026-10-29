import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import type { ConnectRepositoryRequest, RepositoryListItem } from '@/entities/repository'
import { ApiError, type ApiTransport } from '@/shared/api'
import { RepositoriesPage } from '@/pages/RepositoriesPage'
import { RepositorySettingsPage } from '@/pages/RepositorySettingsPage'
import { fakeTransport, renderWithTransport } from '@/test/api'

const INSTALL_URL = 'https://github.com/apps/dmc-268-review/installations/new'
const NO_RIGHTS =
  'Включать и выключать ревью может участник с ролью admin или maintain в этом репозитории'

/** Строка списка: подключённый (по умолчанию), `connected: false` — выключенный или новый. */
function repository(
  n: number,
  full_name: string,
  overrides: Partial<RepositoryListItem> = {},
): RepositoryListItem {
  return {
    provider: 'github',
    provider_id: String(100 + n),
    full_name,
    default_branch: 'main',
    connected: true,
    id: `repo-${n}`,
    can_connect: true,
    connected_at: '2026-09-28T08:30:00Z',
    ...overrides,
  }
}

const ON = repository(1, 'larchanka-training/platform-api')
const OFF = repository(2, 'larchanka-training/docs', {
  connected: false,
  id: null,
  connected_at: null,
})
const NO_RIGHTS_ROW = repository(3, 'colleague/pet', {
  connected: false,
  id: null,
  can_connect: false,
  connected_at: null,
})

const list = (items: RepositoryListItem[], install_url: string | null = INSTALL_URL) => ({
  items,
  install_url,
})

function renderRepositoriesPage(
  transport: Partial<ApiTransport> | ApiTransport['get'] = fakeTransport(),
  url = '/repositories',
) {
  const router = createMemoryRouter(
    [
      { path: '/repositories', element: <RepositoriesPage /> },
      { path: '/repositories/:repositoryId/settings', element: <RepositorySettingsPage /> },
    ],
    { initialEntries: [url] },
  )
  const view = renderWithTransport(
    <RouterProvider router={router} />,
    fakeTransport(typeof transport === 'function' ? { get: transport } : transport),
  )
  return { ...view, router }
}

/** Бэкенд списка: строки меняются мутациями теста, запросы считаются. */
function listBackend(items: RepositoryListItem[], install_url: string | null = INSTALL_URL) {
  const state = { items, install_url }
  const get = vi.fn(async (path: string) => {
    if (path !== '/repositories?limit=200&offset=0') throw new Error(`неожиданный запрос ${path}`)
    return structuredClone(state)
  })
  return { state, get }
}

const reviewSwitch = (name: string) => screen.getByRole('switch', { name: `Ревью ${name}` })

describe('RepositoriesPage', () => {
  it('показывает состояние загрузки, пока список грузится', () => {
    const { container } = renderRepositoriesPage(() => new Promise(() => {}))

    expect(container.querySelector('.ant-spin-spinning')).toBeInTheDocument()
  })

  it('все строки GET /repositories: переключатель «Ревью», «Настройки» только у строк с id', async () => {
    const { get } = listBackend([ON, OFF, NO_RIGHTS_ROW])
    renderRepositoriesPage(get)

    expect(await screen.findByText('larchanka-training/platform-api')).toBeInTheDocument()
    expect(reviewSwitch('larchanka-training/platform-api')).toBeChecked()
    expect(reviewSwitch('larchanka-training/docs')).not.toBeChecked()
    expect(reviewSwitch('larchanka-training/docs')).toBeEnabled()
    expect(reviewSwitch('colleague/pet')).toBeDisabled()
    expect(screen.getAllByText(NO_RIGHTS)).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: 'Настройки larchanka-training/platform-api' }),
    ).toHaveAttribute('href', '/repositories/repo-1/settings')
    expect(
      screen.queryByRole('link', { name: 'Настройки larchanka-training/docs' }),
    ).not.toBeInTheDocument()
    // Авто-ревью вернётся с запуском по вызову: колонки нет.
    expect(screen.queryByText('Автоматическое ревью')).not.toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/repositories?limit=200&offset=0')
  })

  it('выключенный репозиторий с id: переключатель выкл, «Настройки» есть', async () => {
    renderRepositoriesPage(
      listBackend([
        repository(4, 'larchanka-training/legacy', { connected: false, connected_at: null }),
      ]).get,
    )

    expect(
      await screen.findByRole('switch', { name: 'Ревью larchanka-training/legacy' }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('link', { name: 'Настройки larchanka-training/legacy' }),
    ).toBeInTheDocument()
  })

  it('сверху «Добавить репозитории из GitHub» по install_url, «Управлять доступом в GitHub» и подсказка', async () => {
    renderRepositoriesPage(listBackend([ON]).get)

    expect(
      await screen.findByRole('link', { name: 'Добавить репозитории из GitHub' }),
    ).toHaveAttribute('href', INSTALL_URL)
    // Экран установки показывает и аккаунты, где приложение уже стоит, с Configure.
    expect(screen.getByRole('link', { name: 'Управлять доступом в GitHub' })).toHaveAttribute(
      'href',
      INSTALL_URL,
    )
    expect(screen.getByText(/включается и выключается переключателем в строке/)).toBeInTheDocument()
    expect(
      screen.getByText(/Репозитории без доступа пропадают из этого списка/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Подключить репозиторий' })).not.toBeInTheDocument()
  })

  it('install_url: null — кнопки «Добавить» нет и подсказка о ней молчит, доступ — на установки GitHub', async () => {
    renderRepositoriesPage(listBackend([ON], null).get)

    expect(await screen.findByText('larchanka-training/platform-api')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Добавить репозитории из GitHub' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Управлять доступом в GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/settings/installations',
    )
    expect(screen.queryByText(/Добавить репозитории из GitHub/)).not.toBeInTheDocument()
  })

  it('пустой список при install_url: null — без кнопки и без упоминания её', async () => {
    renderRepositoriesPage(listBackend([], null).get)

    expect(await screen.findByText(/Адрес установки сейчас неизвестен/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Добавить' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Добавить репозитории из GitHub/)).not.toBeInTheDocument()
  })

  it('пустой список — подсказка и крупная кнопка «Добавить» вместо таблицы', async () => {
    renderRepositoriesPage(listBackend([]).get)

    expect(
      await screen.findByText(
        'Приложение пока не установлено ни на один ваш репозиторий. Нажмите «Добавить репозитории из GitHub» и отметьте нужные.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Добавить' })).toHaveAttribute('href', INSTALL_URL)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('ответ не по контракту — ошибка, а не пустая таблица', async () => {
    renderRepositoriesPage(async () => ({ items: [ON] }))

    expect(await screen.findByText('Не удалось загрузить репозитории')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('GitHub недоступен (502) — ошибка с повтором, повтор показывает список', async () => {
    let githubDown = true
    renderRepositoriesPage(async () => {
      if (githubDown) throw new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
      return list([OFF])
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Не удалось загрузить репозитории')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    githubDown = false
    await userEvent.click(within(alert).getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('larchanka-training/docs')).toBeInTheDocument()
  })

  it('упал перезапрос (502) — список остаётся, сверху плашка с повтором', async () => {
    let githubDown = false
    const { queryClient } = renderRepositoriesPage(async () => {
      if (githubDown) throw new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
      return list([OFF])
    })
    expect(await screen.findByText('larchanka-training/docs')).toBeInTheDocument()

    githubDown = true
    await act(() => queryClient.refetchQueries())

    const notice = (
      await screen.findByText('Не удалось обновить репозитории')
    ).closest<HTMLElement>('[role="alert"]')
    if (!notice) throw new Error('плашка без role="alert"')
    expect(screen.getByText('larchanka-training/docs')).toBeInTheDocument()
    expect(screen.queryByText('Не удалось загрузить репозитории')).not.toBeInTheDocument()

    githubDown = false
    await userEvent.click(within(notice).getByRole('button', { name: 'Повторить' }))
    await waitFor(() =>
      expect(screen.queryByText('Не удалось обновить репозитории')).not.toBeInTheDocument(),
    )
  })

  it('ссылка «Настройки» — настоящий `<a>` без кнопки внутри и ведёт на экран настроек', async () => {
    const user = userEvent.setup()
    renderRepositoriesPage(async (path) => {
      if (path === '/repositories?limit=200&offset=0') return list([ON])
      if (path === '/repositories/repo-1') {
        return {
          id: 'repo-1',
          provider: 'github',
          provider_id: '101',
          full_name: 'larchanka-training/platform-api',
          default_branch: 'main',
          auto_review_enabled: true,
          created_at: '2026-09-28T08:30:00Z',
          updated_at: '2026-09-28T08:30:00Z',
        }
      }
      if (path === '/repositories/repo-1/settings') {
        return { auto_review_enabled: true, branch_filter: ['feature/**'], min_severity: 'high' }
      }
      if (path === '/repositories/repo-1/rules') {
        return { status: 'absent', branch: 'main', path: '.review/rules.md' }
      }
      throw new Error(`неожиданный запрос ${path}`)
    })

    const settings = await screen.findByRole('link', {
      name: 'Настройки larchanka-training/platform-api',
    })
    expect(screen.queryByRole('button', { name: 'Настройки' })).not.toBeInTheDocument()
    await user.click(settings)

    expect(await screen.findByText('Настройки репозитория')).toBeInTheDocument()
  })
})

describe('RepositoriesPage — переключатель «Ревью»', () => {
  it('вкл — POST /repositories с {provider, provider_id}, затем список перезапрашивается', async () => {
    const user = userEvent.setup()
    const backend = listBackend([OFF])
    const post = vi.fn(async (_path: string, body: unknown) => {
      const { provider_id } = body as ConnectRepositoryRequest
      backend.state.items = backend.state.items.map((r) =>
        r.provider_id === provider_id ? { ...r, connected: true, id: 'repo-2' } : r,
      )
      return {
        id: 'repo-2',
        provider: 'github',
        provider_id,
        full_name: 'larchanka-training/docs',
        default_branch: 'main',
        auto_review_enabled: true,
        created_at: '2026-10-30T10:00:00Z',
        updated_at: '2026-10-30T10:00:00Z',
      }
    })
    renderRepositoriesPage({ get: backend.get, post })

    await screen.findByText('larchanka-training/docs')
    await user.click(reviewSwitch('larchanka-training/docs'))

    await waitFor(() => expect(reviewSwitch('larchanka-training/docs')).toBeChecked())
    expect(post).toHaveBeenCalledWith('/repositories', { provider: 'github', provider_id: '102' })
    expect(backend.get).toHaveBeenCalledTimes(2)
    expect(
      screen.getByRole('link', { name: 'Настройки larchanka-training/docs' }),
    ).toBeInTheDocument()
  })

  it('вкл: 409 «уже подключён» — успех, ошибки нет, строка «вкл» после перезапроса', async () => {
    const user = userEvent.setup()
    const backend = listBackend([OFF])
    const post = vi.fn(async () => {
      // Включил кто-то другой, параллельно.
      backend.state.items = [{ ...OFF, connected: true, id: 'repo-2' }]
      throw new ApiError(409, 'Репозиторий уже подключён', 'REPOSITORY_ALREADY_CONNECTED')
    })
    renderRepositoriesPage({ get: backend.get, post })

    await screen.findByText('larchanka-training/docs')
    await user.click(reviewSwitch('larchanka-training/docs'))

    await waitFor(() => expect(reviewSwitch('larchanka-training/docs')).toBeChecked())
    expect(screen.queryByText('Репозиторий уже подключён')).not.toBeInTheDocument()
  })

  it('вкл: другой 409 — ошибка, переключатель остаётся «выкл»', async () => {
    const user = userEvent.setup()
    const post = vi.fn(async () => {
      throw new ApiError(409, 'Конфликт установки', 'INSTALLATION_CONFLICT')
    })
    renderRepositoriesPage({ get: listBackend([OFF]).get, post })

    await screen.findByText('larchanka-training/docs')
    await user.click(reviewSwitch('larchanka-training/docs'))

    expect(await screen.findByText('Конфликт установки')).toBeInTheDocument()
    expect(reviewSwitch('larchanka-training/docs')).not.toBeChecked()
  })

  it('вкл: 403 — сообщение об ошибке, переключатель остаётся «выкл»', async () => {
    const user = userEvent.setup()
    const post = vi.fn(async () => {
      throw new ApiError(403, 'Нужна роль admin или maintain', 'REPOSITORY_MANAGE_REQUIRED')
    })
    renderRepositoriesPage({ get: listBackend([OFF]).get, post })

    await screen.findByText('larchanka-training/docs')
    await user.click(reviewSwitch('larchanka-training/docs'))

    expect(await screen.findByText('Нужна роль admin или maintain')).toBeInTheDocument()
    expect(reviewSwitch('larchanka-training/docs')).not.toBeChecked()
  })

  it('без прав (can_connect: false) переключатель неактивен, запроса нет', async () => {
    const user = userEvent.setup()
    const post = vi.fn()
    renderRepositoriesPage({ get: listBackend([NO_RIGHTS_ROW]).get, post })

    await screen.findByText('colleague/pet')
    await user.click(reviewSwitch('colleague/pet'))

    expect(reviewSwitch('colleague/pet')).toBeDisabled()
    expect(reviewSwitch('colleague/pet')).not.toBeChecked()
    expect(reviewSwitch('colleague/pet')).toHaveAccessibleDescription(NO_RIGHTS)
    expect(post).not.toHaveBeenCalled()
  })

  it.each([
    [404, 'Репозитория нет в установке GitHub App', 'REPOSITORY_NOT_IN_INSTALLATION'],
    [502, 'GitHub не ответил', 'SCM_UNAVAILABLE'],
  ])('вкл: %i — виден detail, переключатель остаётся «выкл»', async (status, detail, code) => {
    const user = userEvent.setup()
    const post = vi.fn(async () => {
      throw new ApiError(status, detail, code)
    })
    renderRepositoriesPage({ get: listBackend([OFF]).get, post })

    await screen.findByText('larchanka-training/docs')
    await user.click(reviewSwitch('larchanka-training/docs'))

    expect(await screen.findByText(detail)).toBeInTheDocument()
    expect(reviewSwitch('larchanka-training/docs')).not.toBeChecked()
  })

  it('две строки подряд: у первой спиннер, пока ждёт, и её ошибка не теряется', async () => {
    const user = userEvent.setup()
    const OTHER = repository(5, 'larchanka-training/mobile', {
      connected: false,
      id: null,
      connected_at: null,
    })
    let rejectFirst: (error: Error) => void = () => {}
    const post = vi.fn((_path: string, body: unknown) => {
      if ((body as ConnectRepositoryRequest).provider_id === OFF.provider_id) {
        return new Promise<unknown>((_, reject) => {
          rejectFirst = reject
        })
      }
      return Promise.resolve(null)
    })
    renderRepositoriesPage({ get: listBackend([OFF, OTHER]).get, post })

    await screen.findByText('larchanka-training/docs')
    await user.click(reviewSwitch('larchanka-training/docs'))
    await user.click(reviewSwitch('larchanka-training/mobile'))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(reviewSwitch('larchanka-training/docs')).toHaveAttribute('aria-busy', 'true')

    act(() =>
      rejectFirst(new ApiError(403, 'Нужна роль admin или maintain', 'REPOSITORY_MANAGE_REQUIRED')),
    )

    expect(await screen.findByText('Нужна роль admin или maintain')).toBeInTheDocument()
    await waitFor(() =>
      expect(reviewSwitch('larchanka-training/docs')).toHaveAttribute('aria-busy', 'false'),
    )
  })

  it('выкл — подтверждение, затем DELETE /repositories/{id}; 204 — успех', async () => {
    const user = userEvent.setup()
    const backend = listBackend([ON])
    const del = vi.fn(async () => {
      backend.state.items = [{ ...ON, connected: false, connected_at: null }]
      return null
    })
    renderRepositoriesPage({ get: backend.get, delete: del })

    await screen.findByText('larchanka-training/platform-api')
    await user.click(reviewSwitch('larchanka-training/platform-api'))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Выключить ревью в larchanka-training/platform-api?')
    expect(del).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Выключить' }))

    await waitFor(() => expect(reviewSwitch('larchanka-training/platform-api')).not.toBeChecked())
    expect(del).toHaveBeenCalledWith('/repositories/repo-1')
    // История остаётся: настройки выключенного открываются.
    expect(
      screen.getByRole('link', { name: 'Настройки larchanka-training/platform-api' }),
    ).toBeInTheDocument()
  })

  it('выкл: «Отмена» в подтверждении — запроса нет, ревью остаётся включённым', async () => {
    const user = userEvent.setup()
    const del = vi.fn()
    renderRepositoriesPage({ get: listBackend([ON]).get, delete: del })

    await screen.findByText('larchanka-training/platform-api')
    await user.click(reviewSwitch('larchanka-training/platform-api'))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Отмена' }),
    )

    expect(del).not.toHaveBeenCalled()
    expect(reviewSwitch('larchanka-training/platform-api')).toBeChecked()
  })

  it('выкл: 501 — «Выключение ревью пока недоступно», переключатель остаётся «вкл»', async () => {
    const user = userEvent.setup()
    const del = vi.fn(async () => {
      throw new ApiError(501, 'Не реализовано', 'NOT_IMPLEMENTED')
    })
    renderRepositoriesPage({ get: listBackend([ON]).get, delete: del })

    await screen.findByText('larchanka-training/platform-api')
    await user.click(reviewSwitch('larchanka-training/platform-api'))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Выключить' }),
    )

    expect(await screen.findByText('Выключение ревью пока недоступно')).toBeInTheDocument()
    expect(reviewSwitch('larchanka-training/platform-api')).toBeChecked()
  })
})

describe('RepositoriesPage — ошибки выключения', () => {
  it.each([
    [403, 'Нужна роль admin или maintain', 'REPOSITORY_MANAGE_REQUIRED'],
    [404, 'Репозиторий не найден', 'REPOSITORY_NOT_FOUND'],
    [502, 'GitHub не ответил', 'SCM_UNAVAILABLE'],
  ])('выкл: %i — виден detail, переключатель остаётся «вкл»', async (status, detail, code) => {
    const user = userEvent.setup()
    const del = vi.fn(async () => {
      throw new ApiError(status, detail, code)
    })
    renderRepositoriesPage({ get: listBackend([ON]).get, delete: del })

    await screen.findByText('larchanka-training/platform-api')
    await user.click(reviewSwitch('larchanka-training/platform-api'))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Выключить' }),
    )

    expect(await screen.findByText(detail)).toBeInTheDocument()
    expect(reviewSwitch('larchanka-training/platform-api')).toBeChecked()
  })
})

describe('RepositoriesPage — возврат с GitHub', () => {
  it.each([
    ['?connected=2', 'Подключено репозиториев: 2'],
    [
      '?connected=0',
      'Приложение установлено. Включите ревью переключателем в нужных репозиториях.',
    ],
    ['?requested=true', 'Запрос на установку отправлен владельцу'],
  ])('%s — сообщение, итог убран из URL, список запрошен', async (query, text) => {
    const backend = listBackend([ON])
    const { router } = renderRepositoriesPage(backend.get, `/repositories${query}`)

    expect(await screen.findByText(text)).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(backend.get).toHaveBeenCalledWith('/repositories?limit=200&offset=0')
    expect(await screen.findByText('larchanka-training/platform-api')).toBeInTheDocument()
  })

  it.each([
    ['?setup_error=provider_unavailable', /GitHub не ответил/],
    ['?setup_error=installation_not_found', /не нашёл эту установку/],
    ['?setup_error=something_new', 'Не удалось завершить установку приложения на GitHub.'],
  ])('%s — плашка с ошибкой остаётся до закрытия, итог убран из URL', async (query, text) => {
    const user = userEvent.setup()
    const { router } = renderRepositoriesPage(listBackend([ON]).get, `/repositories${query}`)

    const alert = (await screen.findByText(text)).closest('[role="alert"]')
    expect(alert).not.toBeNull()
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(await screen.findByText('larchanka-training/platform-api')).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()

    await user.click(within(alert as HTMLElement).getByRole('button', { name: /close/i }))
    await waitFor(() => expect(screen.queryByText(text)).not.toBeInTheDocument())
  })

  it('чужие параметры адреса остаются', async () => {
    const { router } = renderRepositoriesPage(
      listBackend([ON]).get,
      '/repositories?connected=1&sort=name',
    )

    expect(await screen.findByText('Подключено репозиториев: 1')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe('?sort=name'))
  })
})

/** 25 репозиториев — три страницы по 10. */
const many = Array.from({ length: 25 }, (_, i) =>
  repository(i + 1, `larchanka-training/repo-${String(i + 1).padStart(2, '0')}`),
)

/** Роутер в памяти, чтобы тест мог менять URL и листать историю, как браузер. */
function renderPaginatedAt(url: string) {
  const router = createMemoryRouter([{ path: '/repositories', element: <RepositoriesPage /> }], {
    initialEntries: [url],
  })
  renderWithTransport(
    <RouterProvider router={router} />,
    fakeTransport({ get: async () => list(many) }),
  )
  return router
}

/** Номера репозиториев на видимой странице таблицы. */
async function visibleRepos() {
  await screen.findAllByText(/larchanka-training\/repo-/)
  return screen
    .getAllByText(/larchanka-training\/repo-/)
    .map((el) => Number(el.textContent?.slice(-2)))
}

describe('RepositoriesPage — страница в URL', () => {
  it('открытие с ?page=2 показывает вторую страницу', async () => {
    renderPaginatedAt('/repositories?page=2')

    expect(await visibleRepos()).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page')
  })

  it.each([
    '/repositories',
    '/repositories?page=abc',
    '/repositories?page=0',
    '/repositories?page=-1',
  ])('%s — первая страница', async (url) => {
    renderPaginatedAt(url)

    expect(await visibleRepos()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('страница больше числа страниц — последняя, URL заменяется', async () => {
    const router = renderPaginatedAt('/repositories?page=99')

    expect(await visibleRepos()).toEqual([21, 22, 23, 24, 25])
    await waitFor(() => expect(router.state.location.search).toBe('?page=3'))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('aria-current', 'page')
  })

  it('с клавиатуры: Tab до номера и Enter листают', async () => {
    const user = userEvent.setup()
    const router = renderPaginatedAt('/repositories')
    await visibleRepos()

    const two = screen.getByRole('link', { name: '2' })
    // Строки таблицы с кнопками настроек удлиняют порядок табов, поэтому до номера доходим
    // не более чем за число фокусируемых элементов страницы — дальше он был бы недостижим.
    const focusable = document.querySelectorAll('a[href], button:not([disabled]), input').length
    for (let i = 0; i < focusable && document.activeElement !== two; i += 1) await user.tab()
    expect(two).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(router.state.location.search).toBe('?page=2')
    expect(await visibleRepos()).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
  })

  it('«вперёд», «назад» и номера — ссылки на тот же путь с другим page и прежними параметрами', async () => {
    const router = renderPaginatedAt('/repositories?page=2&sort=name')
    await visibleRepos()

    const next = screen.getByRole('link', { name: 'Следующая страница' })
    expect(next).toHaveAttribute('href', '/repositories?page=3&sort=name')
    expect(screen.getByRole('link', { name: 'Предыдущая страница' })).toHaveAttribute(
      'href',
      '/repositories?sort=name',
    )
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute(
      'href',
      '/repositories?page=3&sort=name',
    )

    fireEvent.click(next)

    expect(await visibleRepos()).toEqual([21, 22, 23, 24, 25])
    expect(router.state.location.search).toBe('?page=3&sort=name')
    // На последней странице «вперёд» недоступно: без адреса, перехода нет.
    const disabledNext = screen.getByRole('link', { name: 'Следующая страница' })
    expect(disabledNext).toHaveAttribute('aria-disabled', 'true')
    expect(disabledNext).not.toHaveAttribute('href')
  })

  it('смена URL и «назад» в браузере меняют страницу', async () => {
    const router = renderPaginatedAt('/repositories')
    expect(await visibleRepos()).toContain(1)

    await act(() => router.navigate('/repositories?page=3'))
    expect(await visibleRepos()).toEqual([21, 22, 23, 24, 25])

    await act(() => router.navigate(-1))
    expect(await visibleRepos()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

    await act(() => router.navigate(1))
    expect(await visibleRepos()).toEqual([21, 22, 23, 24, 25])
  })
})

/** 24 репозитория: `front-01…12` с включённым ревью и `back-01…12` без него, три страницы по 10. */
const mixed = [
  ...Array.from({ length: 12 }, (_, i) =>
    repository(i + 1, `larchanka-training/front-${String(i + 1).padStart(2, '0')}`),
  ),
  ...Array.from({ length: 12 }, (_, i) =>
    repository(i + 13, `larchanka-training/back-${String(i + 1).padStart(2, '0')}`, {
      connected: false,
      id: null,
      connected_at: null,
    }),
  ),
]

function renderFilteredAt(url: string) {
  const router = createMemoryRouter([{ path: '/repositories', element: <RepositoriesPage /> }], {
    initialEntries: [url],
  })
  renderWithTransport(
    <RouterProvider router={router} />,
    fakeTransport({ get: async () => list(mixed) }),
  )
  return router
}

/** Имена на видимой странице таблицы, без префикса организации. */
async function visibleNames() {
  await screen.findAllByText(/^larchanka-training\//)
  return screen
    .getAllByText(/^larchanka-training\//)
    .map((el) => el.textContent?.replace('larchanka-training/', ''))
}

const searchBox = () => screen.getByRole('searchbox', { name: 'Поиск по имени' })

describe('RepositoriesPage — поиск и фильтр', () => {
  it('поиск по имени без учёта регистра фильтрует и сбрасывает страницу', async () => {
    const router = renderFilteredAt('/repositories?page=3')
    expect(await visibleNames()).toEqual(['back-09', 'back-10', 'back-11', 'back-12'])

    fireEvent.change(searchBox(), { target: { value: 'FRONT' } })

    await waitFor(() => expect(router.state.location.search).toBe('?q=FRONT'))
    const names = await visibleNames()
    expect(names).toHaveLength(10)
    expect(names.every((name) => name?.startsWith('front-'))).toBe(true)
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'href',
      '/repositories?q=FRONT&page=2',
    )
  })

  it('страница больше числа страниц после поиска — URL заменяется на последнюю отфильтрованную', async () => {
    // Строк 24, это три страницы, а с `front` их 12, это две.
    const router = renderFilteredAt('/repositories?q=front&page=3')

    expect(await visibleNames()).toEqual(['front-11', 'front-12'])
    await waitFor(() => expect(router.state.location.search).toBe('?q=front&page=2'))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(screen.queryByRole('link', { name: '3' })).not.toBeInTheDocument()
  })

  it('q из URL при открытии: стоит в поле, список отфильтрован', async () => {
    renderFilteredAt('/repositories?q=back-1')

    expect(await visibleNames()).toEqual(['back-10', 'back-11', 'back-12'])
    expect(searchBox()).toHaveValue('back-1')
  })

  it('«назад» после серии правок возвращает прежний поиск и страницу', async () => {
    const router = renderFilteredAt('/repositories?q=back&page=2')
    expect(await visibleNames()).toEqual(['back-11', 'back-12'])

    // Серия правок поиска — одна запись в истории.
    for (const value of ['back-0', 'back-01']) {
      fireEvent.change(searchBox(), { target: { value } })
      await waitFor(() => expect(router.state.location.search).toBe(`?q=${value}`))
    }
    expect(await visibleNames()).toEqual(['back-01'])

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?q=back&page=2')
    expect(searchBox()).toHaveValue('back')
    expect(await visibleNames()).toEqual(['back-11', 'back-12'])
  })

  it('переход на тот же маршрут без q (меню) очищает поле и фильтр', async () => {
    const router = renderFilteredAt('/repositories?q=back')
    expect(await visibleNames()).toHaveLength(10)

    // Как пункт бокового меню: PUSH на тот же маршрут без перемонтирования.
    await act(() => router.navigate('/repositories'))

    expect(searchBox()).toHaveValue('')
    expect((await visibleNames())[0]).toBe('front-01')
  })

  it('правка после возврата на запись поиска — новая запись, а не замена', async () => {
    const router = renderFilteredAt('/repositories')
    await visibleNames()

    fireEvent.change(searchBox(), { target: { value: 'front' } })
    await waitFor(() => expect(router.state.location.search).toBe('?q=front'))
    await act(() => router.navigate(-1))
    expect(searchBox()).toHaveValue('')
    await act(() => router.navigate(1))
    expect(searchBox()).toHaveValue('front')

    fireEvent.change(searchBox(), { target: { value: 'back' } })
    await waitFor(() => expect(router.state.location.search).toBe('?q=back'))

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?q=front')
    expect(searchBox()).toHaveValue('front')
  })

  it('«Только включённые» оставляет строки с включённым ревью, в URL only=enabled', async () => {
    const user = userEvent.setup()
    const router = renderFilteredAt('/repositories?page=3')
    await visibleNames()

    await user.click(screen.getByText('Только включённые'))

    await waitFor(() => expect(router.state.location.search).toBe('?only=enabled'))
    expect((await visibleNames()).every((name) => name?.startsWith('front-'))).toBe(true)
    screen.getAllByRole('switch').forEach((el) => expect(el).toBeChecked())

    // Переключение фильтра добавляет запись в историю: «назад» возвращает прежний адрес.
    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?page=3')
    expect(await visibleNames()).toEqual(['back-09', 'back-10', 'back-11', 'back-12'])
    await act(() => router.navigate(1))
    expect(router.state.location.search).toBe('?only=enabled')

    await user.click(screen.getByText('Все'))
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(await visibleNames()).toHaveLength(10)
  })

  it('only=enabled из URL вместе с поиском', async () => {
    renderFilteredAt('/repositories?only=enabled&q=back')

    expect(await screen.findByText('Ничего не найдено')).toBeInTheDocument()
  })

  it('фильтр ничего не оставил — «Ничего не найдено», а не подсказка про установку', async () => {
    renderFilteredAt('/repositories')
    await visibleNames()

    fireEvent.change(searchBox(), { target: { value: 'нет-такого' } })

    expect(await screen.findByText('Ничего не найдено')).toBeInTheDocument()
    expect(screen.queryByText(/Приложение пока не установлено/)).not.toBeInTheDocument()
    expect(searchBox()).toHaveValue('нет-такого')
  })

  it('итог возврата с GitHub убирается из URL, q и only остаются', async () => {
    const router = renderFilteredAt('/repositories?connected=1&q=front-0&only=enabled')

    expect(await screen.findByText('Подключено репозиториев: 1')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe('?q=front-0&only=enabled'))
    expect(searchBox()).toHaveValue('front-0')
    expect(await visibleNames()).toHaveLength(9)
  })
})
