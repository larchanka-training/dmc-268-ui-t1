import { render, screen, waitFor, within, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '@/app/App'
import type { RepositoryListItem, Repository } from '@/entities/repository'
import type { ApiTransport } from '@/shared/api'
import { ApiError } from '@/shared/api'
import { navigation } from '@/shared/lib'
import { ME, fakeTransport, stubFetch } from '@/test/api'
import { createFakeEventStream, type FakeEventStream } from '@/test/fakeEventStream'
import { makeReviewRun, makeRunListItem } from '@/test/factories'

const REPOSITORY_ID = 'repo-1'
const FULL_NAME = 'larchanka-training/platform-api'
const SETTINGS_URL = `/app/repositories/${REPOSITORY_ID}/settings`

const LIST_ITEM: RepositoryListItem = {
  provider: 'github',
  provider_id: '101',
  full_name: FULL_NAME,
  default_branch: 'main',
  connected: true,
  id: REPOSITORY_ID,
  can_connect: true,
  connected_at: '2026-09-28T08:30:00Z',
  payer_login: 'octocat',
}

const REPOSITORY: Repository = {
  id: REPOSITORY_ID,
  provider: 'github',
  provider_id: '101',
  full_name: FULL_NAME,
  default_branch: 'main',
  auto_review_enabled: true,
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
}

const RUN = makeReviewRun()

type Server = {
  /** Статус прогона `run-1`, который отдаёт бэкенд сейчас. */
  status: string
  failure?: { failed_stage: string; failure_reason: string }
  /** Сколько раз запрошен сам прогон. */
  runRequests: number
}

/**
 * Бэкенд теста по ручкам контракта: репозитории, настройки, статус правил, список прогонов
 * и прогон `run-1` с диффом и шагами. Статус прогона меняет тест — вместе с событием потока.
 */
function backend(server: Server): ApiTransport {
  return fakeTransport({
    get: async (path) => {
      const [route] = path.split('?')
      if (route === '/repositories') return { items: [LIST_ITEM], install_url: null }
      if (route === `/repositories/${REPOSITORY_ID}`) return REPOSITORY
      if (route === `/repositories/${REPOSITORY_ID}/settings`)
        return { auto_review_enabled: true, branch_filter: [], min_severity: 'high' }
      if (route === `/repositories/${REPOSITORY_ID}/rules`)
        return { status: 'absent', branch: 'main', path: '.review/rules.md' }
      if (route === '/reviews')
        return { items: [makeRunListItem({ status: server.status })], total: 1 }
      if (route === `/reviews/${RUN.id}`) {
        server.runRequests += 1
        return {
          ...RUN,
          status: server.status,
          failed_stage: server.failure?.failed_stage ?? null,
          failure_reason: server.failure?.failure_reason ?? null,
          duration_seconds: null,
          findings: [],
          published_comments: [],
        }
      }
      if (route === `/reviews/${RUN.id}/diff`) return { files: [] }
      if (route === `/reviews/${RUN.id}/steps`) return { items: [] }
      throw new ApiError(404, `нет ручки ${path}`, 'ROUTE_NOT_FOUND')
    },
  })
}

let stream: FakeEventStream

/** Приложение на фейке транспорта и потока; сессия жива, если не сказано иное. */
function setup(url: string, status = 'completed') {
  const server: Server = { status, runRequests: 0 }
  stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
  window.history.pushState({}, '', url)
  render(<App transport={backend(server)} eventStream={stream} />)
  return server
}

describe('App', () => {
  beforeEach(() => {
    stream = createFakeEventStream({ autoOpen: true })
    vi.spyOn(navigation, 'assign').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('без сессии уводит с /app/ на статичную /login', async () => {
    window.history.pushState({}, '', '/app/')
    stubFetch({ 'GET /api/v1/auth/me': { status: 401 } })

    render(<App />)

    await waitFor(() => expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2F'))
  })

  it('по умолчанию данные кабинета идут на бэкенд через HTTP', async () => {
    window.history.pushState({}, '', '/app/repositories')
    const calls = stubFetch({
      'GET /api/v1/auth/me': { status: 200, body: ME },
      'GET /api/v1/repositories?limit=200&offset=0': {
        status: 200,
        body: { items: [], install_url: null },
      },
    })

    render(<App />)

    await waitFor(() =>
      expect(calls.map((call) => call.url)).toContain('/api/v1/repositories?limit=200&offset=0'),
    )
  })

  it('с сессией открывает обзор под /app/', async () => {
    setup('/app/')

    expect(await screen.findByText('С возвращением, The Octocat')).toBeInTheDocument()
  })

  it.each([
    ['/app/reviews/42', '/login?redirect=%2Fapp%2Freviews%2F42'],
    ['/app/repositories', '/login?redirect=%2Fapp%2Frepositories'],
    [SETTINGS_URL, `/login?redirect=${encodeURIComponent(SETTINGS_URL)}`],
  ])('без сессии уводит с %s на /login с возвратом на этот экран', async (url, login) => {
    window.history.pushState({}, '', url)
    stubFetch({ 'GET /api/v1/auth/me': { status: 401 } })

    render(
      <App transport={backend({ status: 'completed', runRequests: 0 })} eventStream={stream} />,
    )

    await waitFor(() => expect(navigation.assign).toHaveBeenCalledWith(login))
    expect(screen.queryByText(FULL_NAME)).not.toBeInTheDocument()
    expect(screen.queryByText('Настройки репозитория')).not.toBeInTheDocument()
  })

  it('с сессией глубокая ссылка /app/repositories открывает экран репозиториев', async () => {
    setup('/app/repositories')

    expect(await screen.findByText(FULL_NAME)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/repositories')
  })

  it('с сессией глубокая ссылка на настройки репозитория открывает экран настроек', async () => {
    setup(SETTINGS_URL)

    expect(await screen.findByText('Настройки репозитория')).toBeInTheDocument()
    expect(window.location.pathname).toBe(SETTINGS_URL)
  })

  it('страницы подключения и пункта меню «Подключить репозиторий» больше нет', async () => {
    setup('/app/repositories/connect')

    // Адрес не узнан и уводит на обзор, как любой неизвестный.
    expect(await screen.findByText('С возвращением, The Octocat')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Репозитории/ })).toBeInTheDocument()
    expect(
      screen.queryByRole('menuitem', { name: /Подключить репозиторий/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Подключить репозиторий')).not.toBeInTheDocument()
  })

  it('неизвестный адрес под /app уводит на /app/', async () => {
    setup('/app/unknown')

    expect(await screen.findByText('С возвращением, The Octocat')).toBeInTheDocument()
    // Роутер под basename сводит корень к `/app`, без слэша — это тот же обзор.
    expect(window.location.pathname).toMatch(/^\/app\/?$/)
  })
})

const progress = () => screen.getByRole('region', { name: 'Прогресс прогона' })

describe('App: прогон по событиям потока', () => {
  beforeEach(() => {
    stream = createFakeEventStream({ autoOpen: true })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('прогон доходит до completed: один перезапрос по run.finished, подписка закрыта', async () => {
    const server = setup(`/app/reviews/${RUN.id}`, 'queued')

    expect(await screen.findByText('В очереди', { selector: 'span' })).toBeInTheDocument()
    // Первая загрузка и снимок после open потока: истории у потока нет.
    await waitFor(() => expect(server.runRequests).toBe(2))
    expect(stream.opened).toHaveLength(1)
    expect(screen.getByText('Вердикт появится после завершения')).toBeInTheDocument()

    server.status = 'publishing'
    act(() => stream.emitRun({ status: 'publishing' }))
    const header = screen.getByRole('heading', { name: 'Прогон ревью' }).closest('header')
    expect(
      await within(header as HTMLElement).findByText('Публикация', { selector: 'span' }),
    ).toBeInTheDocument()
    // Смена статуса патчит кэш, а не перезапрашивает прогон.
    expect(server.runRequests).toBe(2)

    server.status = 'completed'
    act(() => stream.emitRun({ status: 'completed', duration_seconds: 134 }, 'run.finished'))

    expect(await screen.findByLabelText(/^Вердикт:/)).toBeInTheDocument()
    expect(within(progress()).getByText('Публикация')).toHaveTextContent('завершён')
    await waitFor(() => expect(server.runRequests).toBe(3))
    expect(stream.active()).toBe(0)
    expect(stream.opened).toHaveLength(1)
  })

  it('сбой по событию: этап и причина, без новых подписок', async () => {
    const server = setup(`/app/reviews/${RUN.id}`, 'building_context')
    await screen.findByText('Сбор контекста', { selector: 'span' })

    server.status = 'failed'
    server.failure = {
      failed_stage: 'analysing',
      failure_reason: 'LLM не ответила за отведённое время',
    }
    act(() =>
      stream.emitRun(
        {
          status: 'failed',
          failed_stage: 'analysing',
          duration_seconds: 60,
        },
        'run.finished',
      ),
    )

    expect(await screen.findByText('Ошибка')).toBeInTheDocument()
    expect(within(progress()).getByText('Анализ LLM')).toHaveTextContent('ошибка')
    expect(
      await within(progress()).findByText('LLM не ответила за отведённое время'),
    ).toBeInTheDocument()
    expect(stream.opened).toHaveLength(1)
  })

  it('вкладка «Ревью»: статус строки меняется по потоку без перезагрузки', async () => {
    setup('/app/reviews', 'queued')

    expect(await screen.findByText('Найдено прогонов: 1')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Ревью/ })).toBeInTheDocument()
    const row = () =>
      screen
        .getByText(`#${RUN.merge_request.number} ${RUN.merge_request.title}`)
        .closest('tr') as HTMLElement
    expect(within(row()).getByText('В очереди')).toBeInTheDocument()

    act(() => stream.emitRun({ status: 'building_context' }))

    await waitFor(() => expect(within(row()).getByText('Сбор контекста')).toBeInTheDocument())
  })
})
