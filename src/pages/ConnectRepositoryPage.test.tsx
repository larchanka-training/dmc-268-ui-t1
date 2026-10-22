import { beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, RouterProvider, Routes, createMemoryRouter } from 'react-router-dom'
import type {
  AvailableRepository,
  ConnectRepositoryRequest,
  Repository,
} from '@/entities/repository'
import { ConnectRepositoryPage } from '@/pages/ConnectRepositoryPage'
import { RepositoriesPage } from '@/pages/RepositoriesPage'
import { ApiError, type ApiTransport } from '@/shared/api'
import { fakeTransport, renderWithTransport } from '@/test/api'

function available(
  provider_id: string,
  name: string,
): Omit<AvailableRepository, 'already_connected'> {
  return {
    provider: 'github',
    provider_id,
    full_name: `larchanka-training/${name}`,
    default_branch: 'main',
  }
}

/** «Бэкенд» в памяти: отвечает в форме контракта, без задержек. */
function createBackend() {
  const pool = [available('1', 'docs'), available('2', 'mobile-app'), available('3', 'infra')]
  let connected: Repository[] = []
  const register = (repo: (typeof pool)[number]) => {
    connected = [
      ...connected,
      {
        ...repo,
        id: `repo-${repo.provider_id}`,
        auto_review_enabled: true,
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-01T10:00:00Z',
      },
    ]
  }
  register(pool[0])
  const transport: ApiTransport = fakeTransport({
    get: async (path) => {
      if (path === '/repositories/available') {
        return {
          items: pool.map((repo) => ({
            ...repo,
            already_connected: connected.some((c) => c.provider_id === repo.provider_id),
          })),
        }
      }
      if (path.startsWith('/repositories')) return { items: connected }
      throw new ApiError(404, path)
    },
    post: async (path, body) => {
      const { provider_id } = body as ConnectRepositoryRequest
      const repo = pool.find((r) => r.provider_id === provider_id)
      if (path !== '/repositories' || !repo) throw new ApiError(404, path)
      register(repo)
      return connected[connected.length - 1]
    },
  })
  return transport
}

let backend: ApiTransport

beforeEach(() => {
  backend = createBackend()
})

function renderConnectPage(transport: ApiTransport = backend) {
  renderWithTransport(
    <MemoryRouter initialEntries={['/repositories/connect']}>
      <Routes>
        <Route path="/repositories/connect" element={<ConnectRepositoryPage />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
      </Routes>
    </MemoryRouter>,
    transport,
  )
}

describe('ConnectRepositoryPage', () => {
  it('фильтрует доступные репозитории по имени', async () => {
    renderConnectPage()

    expect(await screen.findByText('larchanka-training/mobile-app')).toBeInTheDocument()
    expect(screen.getByText('larchanka-training/infra')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Поиск по имени…'), {
      target: { value: 'mobile' },
    })

    await waitFor(() => {
      expect(screen.queryByText('larchanka-training/infra')).not.toBeInTheDocument()
      expect(screen.queryByText('larchanka-training/docs')).not.toBeInTheDocument()
    })
    expect(screen.getByText('larchanka-training/mobile-app')).toBeInTheDocument()
  })

  it('подключённый репозиторий отмечен, а не предлагается снова', async () => {
    renderConnectPage()

    const row = (await screen.findByText('larchanka-training/docs')).closest('tr')
    expect(within(row as HTMLElement).getByText('Подключён')).toBeInTheDocument()
    expect(within(row as HTMLElement).queryByRole('button')).not.toBeInTheDocument()
  })

  it('подключает репозиторий и обновляет список подключённых', async () => {
    renderConnectPage()

    const row = (await screen.findByText('larchanka-training/mobile-app')).closest('tr')
    expect(row).not.toBeNull()
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: /подключить/i }))

    // После mutation — переход на /repositories и свежий список подключённых.
    expect(await screen.findByText('Репозитории', { selector: '.page-title' })).toBeInTheDocument()
    expect(await screen.findByText('larchanka-training/mobile-app')).toBeInTheDocument()
  })

  it('501 от бэкенда — понятное сообщение, что подключение ещё недоступно', async () => {
    const notImplemented = () =>
      Promise.reject(new ApiError(501, 'Не реализовано', 'NOT_IMPLEMENTED'))
    renderConnectPage(fakeTransport({ get: notImplemented, post: notImplemented }))

    expect(await screen.findByText(/Подключение репозиториев пока недоступно/)).toBeInTheDocument()
  })
})

/** 20 доступных репозиториев: `front-01…10` и `back-01…10` — три страницы по 8. */
function manyAvailable(): ApiTransport {
  const names = [
    ...Array.from({ length: 10 }, (_, i) => `front-${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 10 }, (_, i) => `back-${String(i + 1).padStart(2, '0')}`),
  ]
  return fakeTransport({
    get: async () => ({
      items: names.map((name, i) => ({
        ...available(String(i + 1), name),
        already_connected: false,
      })),
    }),
  })
}

function renderConnectAt(url: string) {
  const router = createMemoryRouter(
    [{ path: '/repositories/connect', element: <ConnectRepositoryPage /> }],
    { initialEntries: [url] },
  )
  renderWithTransport(<RouterProvider router={router} />, manyAvailable())
  return router
}

/** Имена репозиториев на видимой странице таблицы, без префикса организации. */
async function visibleNames() {
  await screen.findAllByText(/larchanka-training\//)
  return screen
    .getAllByText(/larchanka-training\//)
    .map((el) => el.textContent?.replace('larchanka-training/', ''))
}

const search = () => screen.getByPlaceholderText('Поиск по имени…')

describe('ConnectRepositoryPage — страница и поиск в URL', () => {
  it('открытие с ?page=2 показывает вторую страницу', async () => {
    renderConnectAt('/repositories/connect?page=2')

    expect(await visibleNames()).toEqual([
      'front-09',
      'front-10',
      'back-01',
      'back-02',
      'back-03',
      'back-04',
      'back-05',
      'back-06',
    ])
  })

  it.each(['', '?page=abc', '?page=0', '?page=-1'])('%j — первая страница', async (query) => {
    renderConnectAt(`/repositories/connect${query}`)

    expect((await visibleNames())[0]).toBe('front-01')
  })

  it('поиск из ?q= фильтрует список и стоит в поле', async () => {
    renderConnectAt('/repositories/connect?q=back')

    expect(await visibleNames()).toHaveLength(8)
    expect((await visibleNames()).every((name) => name?.startsWith('back-'))).toBe(true)
    expect(search()).toHaveValue('back')
  })

  it('ссылка «вперёд» ведёт на page+1 и сохраняет поиск', async () => {
    const router = renderConnectAt('/repositories/connect?q=0&page=1')
    await visibleNames()

    const next = screen.getByRole('link', { name: 'Следующая страница' })
    expect(next).toHaveAttribute('href', '/repositories/connect?q=0&page=2')
    fireEvent.click(next)

    // `0` есть во всех 20 именах: вторая страница — с 9-го.
    expect((await visibleNames())[0]).toBe('front-09')
    expect(router.state.location.search).toBe('?q=0&page=2')
  })

  it('смена поиска сбрасывает страницу на первую', async () => {
    const router = renderConnectAt('/repositories/connect?page=3')
    expect(await visibleNames()).toEqual(['back-07', 'back-08', 'back-09', 'back-10'])

    fireEvent.change(search(), { target: { value: 'front' } })

    await waitFor(() => expect(router.state.location.search).toBe('?q=front'))
    expect((await visibleNames())[0]).toBe('front-01')
  })

  it('«назад» после поиска возвращает прежнюю страницу и пустое поле', async () => {
    const router = renderConnectAt('/repositories/connect?page=3')
    expect(await visibleNames()).toEqual(['back-07', 'back-08', 'back-09', 'back-10'])

    // Серия правок поиска — одна запись в истории.
    for (const value of ['f', 'fr', 'front']) {
      fireEvent.change(search(), { target: { value } })
      await waitFor(() => expect(router.state.location.search).toBe(`?q=${value}`))
    }

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?page=3')
    expect(search()).toHaveValue('')
    expect(await visibleNames()).toEqual(['back-07', 'back-08', 'back-09', 'back-10'])
  })

  it('«назад» после листания возвращает страницу, а поиск остаётся', async () => {
    const router = renderConnectAt('/repositories/connect?q=front')
    await visibleNames()

    fireEvent.click(screen.getByRole('link', { name: '2' }))
    expect(await visibleNames()).toEqual(['front-09', 'front-10'])

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?q=front')
    expect(search()).toHaveValue('front')
    expect((await visibleNames())[0]).toBe('front-01')
  })

  it('переход на тот же маршрут без q (меню) очищает поле и фильтр', async () => {
    const router = renderConnectAt('/repositories/connect?q=front')
    expect(await visibleNames()).toHaveLength(8)
    expect(search()).toHaveValue('front')

    // Как пункт бокового меню: navigate — PUSH на тот же маршрут, без перемонтирования.
    await act(() => router.navigate('/repositories/connect'))

    expect(search()).toHaveValue('')
    expect((await visibleNames()).slice(0, 2)).toEqual(['front-01', 'front-02'])
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute(
      'href',
      '/repositories/connect?page=3',
    )
  })

  it('страница больше числа страниц после поиска — URL заменяется на последнюю', async () => {
    const router = renderConnectAt('/repositories/connect?q=front&page=5')

    expect(await visibleNames()).toEqual(['front-09', 'front-10'])
    await waitFor(() => expect(router.state.location.search).toBe('?q=front&page=2'))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page')
  })
})
