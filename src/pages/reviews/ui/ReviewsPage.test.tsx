import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useParams } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Repository } from '@/entities/repository'
import type { ReviewRunListItem } from '@/entities/review-run'
import { LIST_REFETCH_THROTTLE } from '@/features/live-run-status'
import { ApiError, EventStreamContext, TransportContext } from '@/shared/api'
import { fakeTransport } from '@/test/api'
import { createFakeEventStream, type FakeEventStream } from '@/test/fakeEventStream'
import { makeRunListItem } from '@/test/factories'

import { ReviewsPage } from './ReviewsPage'

/** Id репозитория в контракте — uuid; `repoId(1)` — `acme/api`, как у фабрик. */
const repoId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const repository = (n: number, name: string): Repository => ({
  id: repoId(n),
  provider: 'github',
  provider_id: String(n),
  full_name: name,
  default_branch: 'main',
  auto_review_enabled: true,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
})

const REPOSITORIES = [repository(1, 'acme/api'), repository(2, 'acme/web')]

/** Прогоны от новых к старым: `run-1` самый новый. */
function makeRuns(count: number): ReviewRunListItem[] {
  return Array.from({ length: count }, (_, n) =>
    makeRunListItem({
      id: `run-${n + 1}`,
      status: 'analysing',
      created_at: new Date(Date.UTC(2026, 8, 20, 12) - n * 60_000).toISOString(),
      updated_at: '2026-09-20T12:00:00Z',
      merge_request: {
        ...makeRunListItem().merge_request,
        number: 100 - n,
        title: `Изменение ${n + 1}`,
      },
    }),
  )
}

type Backend = {
  /** Пути всех запросов списка по порядку. */
  calls: string[]
  rows: ReviewRunListItem[]
  error?: unknown
  /** Ошибка списка подключённых репозиториев — опций фильтра «Репозиторий». */
  repositoriesError?: unknown
  /**
   * Задержка ответа: снимок строк берётся в момент запроса, а отдаётся, когда промис разрешится.
   * Так воспроизводится гонка «событие пришло, пока страница в полёте».
   */
  hold?: Promise<void>
}

let backend: Backend
let stream: FakeEventStream

function createTransport() {
  return fakeTransport({
    get: async (path) => {
      if (path.startsWith('/repositories')) {
        if (backend.repositoriesError) throw backend.repositoriesError
        return { items: REPOSITORIES }
      }
      if (path === '/reviews' || path.startsWith('/reviews?')) {
        backend.calls.push(path)
        if (backend.error) throw backend.error
        const params = new URLSearchParams(path.split('?')[1])
        const limit = Number(params.get('limit') ?? 50)
        const offset = Number(params.get('offset') ?? 0)
        const snapshot = {
          items: backend.rows.slice(offset, offset + limit),
          total: backend.rows.length,
        }
        if (backend.hold) await backend.hold
        return snapshot
      }
      throw new ApiError(404, path, 'ROUTE_NOT_FOUND')
    },
  })
}

function RunScreen() {
  const { reviewId } = useParams()
  return <p>Экран прогона {reviewId}</p>
}

function renderPage(url = '/reviews') {
  const router = createMemoryRouter(
    [
      { path: '/reviews', element: <ReviewsPage /> },
      { path: '/reviews/:reviewId', element: <RunScreen /> },
    ],
    { initialEntries: [url] },
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <TransportContext value={createTransport()}>
        <EventStreamContext value={stream}>
          <RouterProvider router={router} />
        </EventStreamContext>
      </TransportContext>
    </QueryClientProvider>,
  )
  const search = () => new URLSearchParams(router.state.location.search)
  return { router, search, unmount }
}

/** Следующие ответы списка ждут `release()`: снимок прочитан сейчас, а придёт позже. */
function holdResponses() {
  let release = () => {}
  backend.hold = new Promise<void>((resolve) => {
    release = () => {
      backend.hold = undefined
      resolve()
    }
  })
  return () => act(() => release())
}

/** Кэш Query оповещает подписчиков через `setTimeout(0)`: даём ему отработать. */
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)))

const lastCall = () => backend.calls[backend.calls.length - 1]

function rowOf(text: string) {
  const row = screen.getByText(text).closest('tr')
  if (!row) throw new Error(`нет строки с «${text}»`)
  return row
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

beforeEach(() => {
  backend = { calls: [], rows: makeRuns(3) }
  stream = createFakeEventStream()
})

afterEach(() => {
  vi.restoreAllMocks()
  setVisibility('visible')
})

describe('ReviewsPage: таблица и URL', () => {
  it('показывает колонки прогона и «найдено N»', async () => {
    backend.rows = [
      makeRunListItem({
        id: 'run-1',
        status: 'completed',
        trigger: 'manual',
        duration_seconds: 134,
        findings_count: 5,
        merge_request: {
          ...makeRunListItem().merge_request,
          url: 'https://github.com/acme/api/pull/7',
        },
      }),
    ]
    renderPage()

    await screen.findByText('#7 Чтение токена из окружения')
    const row = rowOf('#7 Чтение токена из окружения')
    expect(within(row).getByText('acme/api')).toBeInTheDocument()
    expect(within(row).getByText('Завершён')).toBeInTheDocument()
    expect(within(row).getByText('Вручную')).toBeInTheDocument()
    expect(within(row).getByText('2 мин 14 с')).toBeInTheDocument()
    expect(within(row).getByText('5')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'PR #7 у провайдера' })).toHaveAttribute(
      'href',
      'https://github.com/acme/api/pull/7',
    )
    expect(screen.getByText('Найдено прогонов: 1')).toBeInTheDocument()
  })

  it('берёт поиск, фильтры, страницу и размер из URL', async () => {
    backend.rows = makeRuns(25)
    renderPage(
      '/reviews?q=env&author=a.petrova&active=true&status=failed&status=queued' +
        `&repository_id=${repoId(1)}&from=2026-09-01&to=2026-09-30&page=2&page_size=10`,
    )

    await waitFor(() =>
      expect(lastCall()).toBe(
        '/reviews?q=env&author=a.petrova&active=true&status=failed&status=queued' +
          `&repository_id=${repoId(1)}&created_from=2026-09-01T00%3A00%3A00.000Z` +
          '&created_to=2026-10-01T00%3A00%3A00.000Z&limit=10&offset=10',
      ),
    )
    expect(screen.getByRole('searchbox', { name: 'Поиск прогонов' })).toHaveValue('env')
    expect(screen.getByLabelText('Начало периода')).toHaveValue('2026-09-01')
    expect(await screen.findByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page')
  })

  it('некорректные параметры URL — значения по умолчанию', async () => {
    renderPage(
      '/reviews?page=abc&page_size=7&active=maybe&status=bogus&from=2026-13-01&to=2026-09-31' +
        '&repository_id=foo&repository_id=repo-1',
    )
    await waitFor(() => expect(lastCall()).toBe('/reviews?limit=20&offset=0'))
  })

  it('фильтры пишутся в URL и сбрасывают страницу', async () => {
    backend.rows = makeRuns(45)
    const user = userEvent.setup()
    const { router, search } = renderPage('/reviews?page=2')
    await screen.findByText('Найдено прогонов: 45')

    await user.click(screen.getByText('Завершённые'))
    await waitFor(() => expect(search().get('active')).toBe('false'))
    expect(search().has('page')).toBe(false)

    await user.type(screen.getByRole('searchbox', { name: 'Поиск прогонов' }), '#42{Enter}')
    await waitFor(() => expect(search().get('q')).toBe('#42'))
    await waitFor(() => expect(lastCall()).toBe('/reviews?q=%2342&active=false&limit=20&offset=0'))

    // «Назад» возвращает прежний поиск: поле и запрос следуют за URL.
    await act(() => router.navigate(-1))
    expect(search().has('q')).toBe(false)
    expect(screen.getByRole('searchbox', { name: 'Поиск прогонов' })).toHaveValue('')
    await waitFor(() => expect(lastCall()).toBe('/reviews?active=false&limit=20&offset=0'))
  })

  it('несколько репозиториев — повторяющийся repository_id', async () => {
    const user = userEvent.setup()
    const { search } = renderPage()
    await screen.findByText('Найдено прогонов: 3')

    await user.click(screen.getByRole('combobox', { name: 'Репозиторий' }))
    await user.click(await screen.findByTitle('acme/api'))
    await user.click(await screen.findByTitle('acme/web'))

    await waitFor(() => expect(search().getAll('repository_id')).toEqual([repoId(1), repoId(2)]))
    await waitFor(() =>
      expect(lastCall()).toBe(
        `/reviews?repository_id=${repoId(1)}&repository_id=${repoId(2)}&limit=20&offset=0`,
      ),
    )
  })

  it('страницы по total: номер страницы уходит в URL и в offset', async () => {
    backend.rows = makeRuns(45)
    const user = userEvent.setup()
    const { search } = renderPage()
    await screen.findByText('Найдено прогонов: 45')

    await user.click(screen.getByRole('link', { name: '3' }))

    expect(search().get('page')).toBe('3')
    await waitFor(() => expect(lastCall()).toBe('/reviews?limit=20&offset=40'))
    expect(await screen.findByText('#56 Изменение 45')).toBeInTheDocument()
  })

  it('строка ведёт на экран прогона', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('#99 Изменение 2')
    await user.click(within(rowOf('#99 Изменение 2')).getByText('acme/api'))

    expect(await screen.findByText('Экран прогона run-2')).toBeInTheDocument()
  })
})

describe('ReviewsPage: обновления из потока', () => {
  it('без фильтров на первой странице — upsert строки без запроса', async () => {
    renderPage()
    await screen.findByText('Найдено прогонов: 3')
    const calls = backend.calls.length
    expect(stream.opened).toEqual(['/api/v1/events'])

    act(() => {
      stream.emitRun({
        ...makeRuns(1)[0],
        status: 'publishing',
        updated_at: '2026-09-20T12:05:00Z',
      })
    })
    await waitFor(() =>
      expect(within(rowOf('#100 Изменение 1')).getByText('Публикация')).toBeInTheDocument(),
    )

    act(() => {
      stream.emitRun(
        {
          ...makeRuns(1)[0],
          id: 'run-new',
          status: 'queued',
          created_at: '2026-09-20T13:00:00Z',
          merge_request: { ...makeRuns(1)[0].merge_request, number: 200, title: 'Свежий PR' },
        },
        'run.created',
      )
    })
    await screen.findByText('#200 Свежий PR')
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('#200 Свежий PR')).toBeInTheDocument()
    expect(screen.getByText('Найдено прогонов: 4')).toBeInTheDocument()
    expect(backend.calls).toHaveLength(calls)
  })

  it('событие старше строки её не меняет', async () => {
    renderPage()
    await screen.findByText('Найдено прогонов: 3')

    act(() => {
      stream.emitRun({ ...makeRuns(1)[0], status: 'queued', updated_at: '2026-09-20T11:00:00Z' })
    })
    await flush()

    expect(within(rowOf('#100 Изменение 1')).getByText('Анализ')).toBeInTheDocument()
  })

  it('при фильтрах — перезапрос страницы, пачка событий даёт не больше двух запросов', async () => {
    renderPage('/reviews?active=true')
    await screen.findByText('Найдено прогонов: 3')
    const calls = backend.calls.length

    act(() => {
      for (let i = 0; i < 5; i += 1) stream.emitRun({ status: 'publishing' })
    })
    await waitFor(() => expect(backend.calls).toHaveLength(calls + 1))

    await act(() => new Promise((resolve) => setTimeout(resolve, LIST_REFETCH_THROTTLE + 100)))
    expect(backend.calls).toHaveLength(calls + 2)
    expect(lastCall()).toBe('/reviews?active=true&limit=20&offset=0')
  })

  it('не на первой странице — перезапрос, а не upsert', async () => {
    backend.rows = makeRuns(25)
    renderPage('/reviews?page=2')
    await screen.findByText('Найдено прогонов: 25')
    const calls = backend.calls.length

    act(() => stream.emitRun({ status: 'publishing' }, 'run.created'))

    await waitFor(() => expect(backend.calls).toHaveLength(calls + 1))
    expect(lastCall()).toBe('/reviews?limit=20&offset=20')
  })

  it('open потока — перезапрос страницы', async () => {
    renderPage()
    await screen.findByText('Найдено прогонов: 3')
    const calls = backend.calls.length

    act(() => stream.setState('open'))

    await waitFor(() => expect(backend.calls).toHaveLength(calls + 1))
  })

  it('скрытая вкладка закрывает поток, возврат открывает его и перезапрашивает страницу', async () => {
    renderPage()
    await screen.findByText('Найдено прогонов: 3')
    expect(stream.active()).toBe(1)

    setVisibility('hidden')
    expect(stream.active()).toBe(0)

    const calls = backend.calls.length
    setVisibility('visible')
    expect(stream.active()).toBe(1)
    act(() => stream.setState('open'))
    await waitFor(() => expect(backend.calls).toHaveLength(calls + 1))
  })

  it('скрытая вкладка не открывает поток при загрузке страницы', async () => {
    setVisibility('hidden')
    renderPage()
    await screen.findByText('Найдено прогонов: 3')

    expect(stream.opened).toEqual([])
  })

  const freshRun = (): ReviewRunListItem => ({
    ...makeRuns(1)[0],
    id: 'run-new',
    status: 'queued',
    created_at: '2026-09-20T13:00:00Z',
    updated_at: '2026-09-20T13:00:00Z',
    merge_request: { ...makeRuns(1)[0].merge_request, number: 200, title: 'Свежий PR' },
  })

  it('снимок, прочитанный до события, не откатывает строку', async () => {
    renderPage()
    await screen.findByText('Найдено прогонов: 3')
    const calls = backend.calls.length

    // `open` → перезапрос; сервер прочитал строки до смены статуса, ответ задержался.
    const release = holdResponses()
    act(() => stream.setState('open'))
    await waitFor(() => expect(backend.calls).toHaveLength(calls + 1))
    act(() => {
      stream.emitRun({
        ...makeRuns(1)[0],
        status: 'publishing',
        updated_at: '2026-09-20T12:05:00Z',
      })
    })
    await waitFor(() =>
      expect(within(rowOf('#100 Изменение 1')).getByText('Публикация')).toBeInTheDocument(),
    )

    release()
    await flush()

    expect(within(rowOf('#100 Изменение 1')).getByText('Публикация')).toBeInTheDocument()
  })

  it('run.created во время перезапроса не пропадает, когда приходит снимок без него', async () => {
    renderPage()
    await screen.findByText('Найдено прогонов: 3')
    const calls = backend.calls.length

    const release = holdResponses()
    act(() => stream.setState('open'))
    await waitFor(() => expect(backend.calls).toHaveLength(calls + 1))
    act(() => stream.emitRun(freshRun(), 'run.created'))
    await screen.findByText('#200 Свежий PR')

    release()
    await flush()

    expect(screen.getByText('#200 Свежий PR')).toBeInTheDocument()
    expect(screen.getByText('Найдено прогонов: 4')).toBeInTheDocument()
  })

  it('событие, пришедшее до первого ответа первой страницы, накладывается на снимок', async () => {
    backend.rows = makeRuns(25)
    const user = userEvent.setup()
    renderPage('/reviews?page=2')
    await screen.findByText('Найдено прогонов: 25')
    const calls = backend.calls.length

    // Под ключом первой страницы данных ещё нет: событие нужно сохранить до ответа.
    const release = holdResponses()
    await user.click(screen.getByRole('link', { name: '1' }))
    await waitFor(() => expect(backend.calls).toHaveLength(calls + 1))
    expect(lastCall()).toBe('/reviews?limit=20&offset=0')
    act(() => stream.emitRun(freshRun(), 'run.created'))

    release()

    expect(await screen.findByText('#200 Свежий PR')).toBeInTheDocument()
    expect(screen.getByText('Найдено прогонов: 26')).toBeInTheDocument()
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('#200 Свежий PR')).toBeInTheDocument()
  })

  it('подписка одна при смене фильтра и страницы и закрывается при уходе', async () => {
    backend.rows = makeRuns(45)
    const user = userEvent.setup()
    const { unmount } = renderPage()
    await screen.findByText('Найдено прогонов: 45')
    expect(stream.active()).toBe(1)

    await user.click(screen.getByText('Завершённые'))
    await waitFor(() => expect(lastCall()).toBe('/reviews?active=false&limit=20&offset=0'))
    await user.click(await screen.findByRole('link', { name: '2' }))
    await waitFor(() => expect(lastCall()).toBe('/reviews?active=false&limit=20&offset=20'))
    await flush()

    expect(stream.opened).toEqual(['/api/v1/events'])
    expect(stream.active()).toBe(1)

    unmount()
    expect(stream.active()).toBe(0)
  })

  it('незнакомый тип и событие вне схемы не ломают страницу', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()
    await screen.findByText('Найдено прогонов: 3')

    act(() => {
      stream.emit('repository.synced', { id: 'repo-1' })
      stream.emit('run.status_changed', { id: 'run-1', status: 'publishing' })
    })

    await flush()
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(within(rowOf('#100 Изменение 1')).getByText('Анализ')).toBeInTheDocument()

    act(() => {
      stream.emitRun({
        ...makeRuns(1)[0],
        status: 'publishing',
        updated_at: '2026-09-20T12:05:00Z',
      })
    })
    await waitFor(() =>
      expect(within(rowOf('#100 Изменение 1')).getByText('Публикация')).toBeInTheDocument(),
    )
  })
})

describe('ReviewsPage: ошибки', () => {
  it('GitHub недоступен (502) — сообщение с повтором, без подписки на поток', async () => {
    backend.error = new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
    renderPage()

    expect(await screen.findByText('Не удалось загрузить прогоны')).toBeInTheDocument()
    expect(stream.opened).toEqual([])
  })

  it('репозитории фильтра не загрузились (502) — в списке опций ошибка с повтором', async () => {
    backend.repositoriesError = new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Найдено прогонов: 3')

    await user.click(screen.getByRole('combobox', { name: 'Репозиторий' }))
    const problem = await screen.findByText(/Не удалось загрузить репозитории/)
    backend.repositoriesError = undefined
    await user.click(within(problem).getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByTitle('acme/api')).toBeInTheDocument()
  })

  it('прочая ошибка — сообщение с повтором', async () => {
    backend.error = new ApiError(500, 'Сбой', 'INTERNAL_ERROR')
    renderPage()

    expect(await screen.findByText('Не удалось загрузить прогоны')).toBeInTheDocument()
    expect(stream.opened).toEqual([])
  })

  it('пустой список с фильтрами объясняет, почему пусто', async () => {
    backend.rows = []
    renderPage('/reviews?status=failed')

    expect(await screen.findByText('Нет прогонов под эти фильтры')).toBeInTheDocument()
  })
})
