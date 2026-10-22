import { describe, expect, it } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom'
import type { Repository } from '@/entities/repository'
import { RepositoriesPage } from '@/pages/RepositoriesPage'
import { fakeTransport, renderWithTransport } from '@/test/api'

function repository(n: number, full_name: string, auto_review_enabled: boolean): Repository {
  return {
    id: `repo-${n}`,
    provider: 'github',
    provider_id: String(100 + n),
    full_name,
    default_branch: 'main',
    auto_review_enabled,
    created_at: '2026-09-28T08:30:00Z',
    updated_at: '2026-09-28T08:30:00Z',
  }
}

function renderRepositoriesPage(get = fakeTransport().get) {
  return renderWithTransport(
    <MemoryRouter>
      <RepositoriesPage />
    </MemoryRouter>,
    fakeTransport({ get }),
  )
}

describe('RepositoriesPage', () => {
  it('показывает состояние загрузки, пока список грузится', () => {
    const { container } = renderRepositoriesPage(() => new Promise(() => {}))

    expect(container.querySelector('.ant-spin-spinning')).toBeInTheDocument()
  })

  it('отображает подключённые репозитории из GET /repositories', async () => {
    const paths: string[] = []
    renderRepositoriesPage(async (path) => {
      paths.push(path)
      return {
        items: [
          repository(1, 'larchanka-training/platform-api', true),
          repository(2, 'larchanka-training/docs', false),
        ],
      }
    })

    expect(await screen.findByText('larchanka-training/platform-api')).toBeInTheDocument()
    expect(screen.getByText('larchanka-training/docs')).toBeInTheDocument()
    expect(screen.getByText('Включено')).toBeInTheDocument()
    expect(screen.getByText('Выключено')).toBeInTheDocument()
    // Время — общим форматтером `shared/lib`, как на экране прогона.
    expect(screen.getAllByText('28.09.2026, 08:30 UTC')).toHaveLength(2)
    expect(paths).toEqual(['/repositories?limit=200'])
  })

  it('ответ не по контракту — ошибка, а не пустая таблица', async () => {
    renderRepositoriesPage(async () => [repository(1, 'larchanka-training/docs', true)])

    expect(await screen.findByText('Не удалось загрузить репозитории')).toBeInTheDocument()
  })
})

/** 25 подключённых репозиториев — три страницы по 10. */
const many = Array.from({ length: 25 }, (_, i) =>
  repository(i + 1, `larchanka-training/repo-${String(i + 1).padStart(2, '0')}`, true),
)

/** Роутер в памяти, чтобы тест мог менять URL и листать историю, как браузер. */
function renderPaginatedAt(url: string) {
  const router = createMemoryRouter([{ path: '/repositories', element: <RepositoriesPage /> }], {
    initialEntries: [url],
  })
  renderWithTransport(
    <RouterProvider router={router} />,
    fakeTransport({ get: async () => ({ items: many }) }),
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
    for (let i = 0; i < 20 && document.activeElement !== two; i += 1) await user.tab()
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
