import { act, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '@/app/App'
import type { ApiTransport, EventStream } from '@/shared/api'
import { navigation } from '@/shared/lib'
import { ME, stubFetch } from '@/test/api'

import { createMockAdapter } from './mocks/mockAdapter'
import { createScenarioEventStream } from './mocks/mockEventStream'
import { createMockServer, FAILED_SCENARIO } from './mocks/mockServer'

const STEP_MS = 4_000

/** Собирает приложение на mock adapter и mock-потоке с общим «сервером» и считает обращения. */
function setup(scenario?: Parameters<typeof createMockServer>[0]) {
  const server = createMockServer({ ...scenario, stepMs: STEP_MS })
  const adapter = createMockAdapter({ latencyMs: 0, server })
  const stream = createScenarioEventStream(server)
  const calls = { get: 0, subscribe: 0 }
  // Считаем только запросы самого прогона: дополнения экрана грузятся рядом и не меняют сценарий.
  const transport: ApiTransport = {
    ...adapter,
    get: (path) => {
      if (path === '/reviews/run-42') calls.get += 1
      return adapter.get(path)
    },
  }
  const eventStream: EventStream = {
    subscribe: (path, handlers) => {
      calls.subscribe += 1
      return stream.subscribe(path, handlers)
    },
  }
  // Экран прогона под `RequireAuth`: сессия жива, данные прогона — из mock adapter.
  stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
  window.history.pushState({}, '', '/app/reviews/run-42')
  render(<App transport={transport} eventStream={eventStream} />)
  return { calls }
}

describe('App', () => {
  beforeEach(() => {
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

  it('без мока данные кабинета идут на бэкенд через HTTP', async () => {
    window.history.pushState({}, '', '/app/repositories')
    const calls = stubFetch({
      'GET /api/v1/auth/me': { status: 200, body: ME },
      'GET /api/v1/repositories?limit=200': { status: 200, body: { items: [] } },
    })

    render(<App useMockApi={false} />)

    await waitFor(() =>
      expect(calls.map((call) => call.url)).toContain('/api/v1/repositories?limit=200'),
    )
  })

  it('с сессией открывает обзор под /app/', async () => {
    window.history.pushState({}, '', '/app/')
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    render(<App />)

    expect(await screen.findByText('С возвращением, The Octocat')).toBeInTheDocument()
  })

  it('без сессии уводит с /app/reviews/42 на /login с возвратом на экран прогона', async () => {
    window.history.pushState({}, '', '/app/reviews/42')
    stubFetch({ 'GET /api/v1/auth/me': { status: 401 } })

    render(<App />)

    await waitFor(() =>
      expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2Freviews%2F42'),
    )
  })

  it('без сессии уводит с /app/repositories на /login с возвратом на этот экран', async () => {
    window.history.pushState({}, '', '/app/repositories')
    stubFetch({ 'GET /api/v1/auth/me': { status: 401 } })

    render(<App />)

    await waitFor(() =>
      expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2Frepositories'),
    )
    expect(screen.queryByText('larchanka-training/platform-api')).not.toBeInTheDocument()
  })

  it('с сессией глубокая ссылка /app/repositories открывает экран репозиториев', async () => {
    window.history.pushState({}, '', '/app/repositories')
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    render(<App />)

    expect(await screen.findByText('larchanka-training/platform-api')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/repositories')
  })

  it('без сессии уводит с /app/repositories/repo-1/settings на /login с возвратом на настройки', async () => {
    window.history.pushState({}, '', '/app/repositories/repo-1/settings')
    stubFetch({ 'GET /api/v1/auth/me': { status: 401 } })

    render(<App />)

    await waitFor(() =>
      expect(navigation.assign).toHaveBeenCalledWith(
        '/login?redirect=%2Fapp%2Frepositories%2Frepo-1%2Fsettings',
      ),
    )
    expect(screen.queryByText('Настройки репозитория')).not.toBeInTheDocument()
  })

  it('с сессией глубокая ссылка /app/repositories/repo-1/settings открывает экран настроек', async () => {
    window.history.pushState({}, '', '/app/repositories/repo-1/settings')
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    render(<App />)

    expect(await screen.findByText('Настройки репозитория')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/repositories/repo-1/settings')
  })

  it('неизвестный адрес под /app уводит на /app/', async () => {
    window.history.pushState({}, '', '/app/unknown')
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    render(<App />)

    expect(await screen.findByText('С возвращением, The Octocat')).toBeInTheDocument()
    // Роутер под basename сводит корень к `/app`, без слэша — это тот же обзор.
    expect(window.location.pathname).toMatch(/^\/app\/?$/)
  })
})

const progress = () => screen.getByRole('region', { name: 'Прогресс прогона' })

describe('App на mock adapter и mock-потоке', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('прогон доходит до completed, затем один перезапрос и подписка больше не открывается', async () => {
    const { calls } = setup()

    expect(await screen.findByText('В очереди', { selector: 'span' })).toBeInTheDocument()
    expect(calls).toEqual({ get: 1, subscribe: 1 })
    expect(screen.getByText('Вердикт появится после завершения')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(STEP_MS * 3))
    // Статус — в шапке прогона: «Публикация» есть и в списке шагов.
    const header = screen.getByRole('heading', { name: 'Прогон ревью' }).closest('header')
    expect(
      await within(header as HTMLElement).findByText('Публикация', { selector: 'span' }),
    ).toBeInTheDocument()
    // Текущий шаг виден в ходе прогона: список шагов перезапрашивается на смене этапа.
    const steps = await screen.findByRole('list', { name: 'Шаги прогона' })
    await waitFor(() =>
      expect(within(steps).getAllByRole('listitem').slice(-1)[0]).toHaveTextContent(
        /Публикация.*выполняется/,
      ),
    )
    expect(calls.get).toBe(1)

    await act(() => vi.advanceTimersByTimeAsync(STEP_MS))

    // Замечания и вердикт приходят перезапросом, который вызвало терминальное событие.
    expect(await screen.findByLabelText(/^Вердикт:/)).toBeInTheDocument()
    expect(within(progress()).getByText('Публикация')).toHaveTextContent('завершён')
    expect(calls).toEqual({ get: 2, subscribe: 1 })

    await act(() => vi.advanceTimersByTimeAsync(STEP_MS * 10))
    expect(calls).toEqual({ get: 2, subscribe: 1 })
  })

  it('сценарий сбоя заканчивается failed с этапом и причиной, без новых подписок', async () => {
    const { calls } = setup({ scenario: FAILED_SCENARIO })
    await screen.findByText('В очереди', { selector: 'span' })

    await act(() => vi.advanceTimersByTimeAsync(STEP_MS * 2))

    expect(await screen.findByText('Ошибка')).toBeInTheDocument()
    expect(within(progress()).getByText('Анализ LLM')).toHaveTextContent('ошибка')
    expect(within(progress()).getByText('LLM не ответила за отведённое время')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(STEP_MS * 10))
    expect(calls).toEqual({ get: 2, subscribe: 1 })
  })
})
