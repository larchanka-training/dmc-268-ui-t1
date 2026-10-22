import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { applyRunEvent, type ReviewRun, type ReviewRunListItem } from '../../../entities/review-run'
import { EventStreamContext } from '../../../shared/api'
import { navigation } from '../../../shared/lib'
import { ME, stubFetch } from '../../../test/api'
import { createFakeEventStream, type FakeEventStream } from '../../../test/fakeEventStream'
import { makeReviewRun } from '../../../test/factories'
import { ConnectionNotice } from '../ui/ConnectionNotice'
import { useRunLiveStatus } from './useRunLiveStatus'

type CacheData = { run: ReviewRun }

const queryKey = ['live-test'] as const
const patchCache = (data: CacheData, event: ReviewRunListItem): CacheData => ({
  run: applyRunEvent(data.run, event),
})

let stream: FakeEventStream
let fetches: number
let serverRun: ReviewRun

/** Экран в миниатюре: прогон в кэше запроса плюс хук подписки, больше ничего. */
function Harness() {
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<CacheData> => {
      fetches += 1
      return { run: serverRun }
    },
    staleTime: Infinity,
  })
  const run = query.data?.run
  const live = useRunLiveStatus({
    runId: 'run-1',
    status: run?.status ?? 'completed',
    queryKey,
    patchCache,
  })
  return (
    <div>
      <p>Статус: {run?.status}</p>
      <p>Прогресс: {run?.last_progress_at}</p>
      <p>Виденный этап: {live.seenStage ?? 'нет'}</p>
      <ConnectionNotice state={live.streamState} onRefresh={() => void live.refresh()} />
    </div>
  )
}

function renderHarness(initial: Partial<ReviewRun> = { status: 'analysing' }) {
  serverRun = makeReviewRun(initial)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData<CacheData>(queryKey, { run: serverRun })
  render(
    <QueryClientProvider client={queryClient}>
      <EventStreamContext value={stream}>
        <Harness />
      </EventStreamContext>
    </QueryClientProvider>,
  )
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('useRunLiveStatus', () => {
  beforeEach(() => {
    stream = createFakeEventStream()
    fetches = 0
    vi.spyOn(navigation, 'assign').mockImplementation(() => {})
    // Отказ потока проверяет сессию через `/auth/me`; по умолчанию она жива.
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    setVisibility('visible')
  })

  it('событие своего прогона обновляет статус и прогресс без перезагрузки', async () => {
    renderHarness()

    act(() => stream.emitRun({ status: 'publishing', last_progress_at: '2026-09-20T14:09:00Z' }))

    expect(await screen.findByText('Статус: publishing')).toBeInTheDocument()
    expect(screen.getByText('Прогресс: 2026-09-20T14:09:00Z')).toBeInTheDocument()
    expect(fetches).toBe(0)
    expect(stream.opened).toEqual(['/api/v1/events'])
  })

  it('событие чужого прогона экран не меняет', async () => {
    renderHarness()

    act(() => stream.emitRun({ id: 'run-2', status: 'publishing' }))
    act(() => stream.emitRun({ id: 'run-2', status: 'completed' }, 'run.finished'))

    expect(screen.getByText('Статус: analysing')).toBeInTheDocument()
    expect(fetches).toBe(0)
    expect(stream.active()).toBe(1)

    act(() => stream.emitRun({ status: 'publishing' }))
    expect(await screen.findByText('Статус: publishing')).toBeInTheDocument()
  })

  it('незнакомый тип события пропускается молча, подписка жива', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderHarness()

    act(() => stream.emit('repository.synced', { id: 'run-1', status: 'publishing' }))
    act(() => stream.emit('ping', {}))

    expect(screen.getByText('Статус: analysing')).toBeInTheDocument()
    expect(error).not.toHaveBeenCalled()
    expect(stream.active()).toBe(1)

    act(() => stream.emitRun({ status: 'publishing' }))
    expect(await screen.findByText('Статус: publishing')).toBeInTheDocument()
  })

  it('событие старше прогона в кэше не затирает его', () => {
    renderHarness()

    act(() => stream.emitRun({ status: 'building_context', updated_at: '2026-09-20T14:06:00Z' }))

    expect(screen.getByText('Статус: analysing')).toBeInTheDocument()
  })

  it('на open и на каждое переподключение прогон перезапрашивается снимком', async () => {
    renderHarness({ status: 'building_context' })

    act(() => stream.setState('open'))
    await waitFor(() => expect(fetches).toBe(1))

    // Пока обрыв, прогон ушёл вперёд, а событие перехода потеряно: поток истории не хранит.
    act(() => stream.setState('reconnecting'))
    serverRun = makeReviewRun({ status: 'analysing' })
    act(() => stream.setState('open'))

    expect(await screen.findByText('Статус: analysing')).toBeInTheDocument()
    expect(fetches).toBe(2)
    expect(stream.opened).toHaveLength(1)
  })

  it.each(['completed', 'failed', 'cancelled'])(
    'для прогона в статусе %s подписка не открывается',
    (status) => {
      renderHarness({ status })

      expect(stream.opened).toEqual([])
    },
  )

  it('run.finished: один перезапрос прогона и закрытая подписка', async () => {
    renderHarness()
    serverRun = makeReviewRun({ status: 'completed', failure_reason: null })

    act(() => stream.emitRun({ status: 'completed' }, 'run.finished'))

    await waitFor(() => expect(fetches).toBe(1))
    expect(screen.getByText('Статус: completed')).toBeInTheDocument()
    expect(stream.active()).toBe(0)
    // Запоздавшие события после завершения запросов не плодят.
    act(() => stream.emitRun({ status: 'completed' }, 'run.finished'))
    expect(fetches).toBe(1)
  })

  it('два run.finished подряд перезапрашивают прогон один раз', async () => {
    renderHarness()
    serverRun = makeReviewRun({ status: 'completed' })

    act(() => {
      stream.emitRun({ status: 'completed' }, 'run.finished')
      stream.emitRun({ status: 'completed' }, 'run.finished')
    })

    expect(await screen.findByText('Статус: completed')).toBeInTheDocument()
    await waitFor(() => expect(stream.active()).toBe(0))
    expect(fetches).toBe(1)
  })

  it('без событий запросов к API по таймеру нет', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderHarness()

    await act(() => vi.advanceTimersByTimeAsync(10 * 60 * 1000))

    expect(fetches).toBe(0)
    expect(screen.getByText('Статус: analysing')).toBeInTheDocument()
  })

  it('событие вне схемы отбрасывается: экран не меняется, подписка жива', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderHarness()

    act(() => stream.emit('run.status_changed', { id: 'run-1', last_progress_at: null }))

    expect(screen.getByText('Статус: analysing')).toBeInTheDocument()
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ name: 'ContractError' }))
    expect(stream.active()).toBe(1)

    act(() => stream.emitRun({ status: 'publishing' }))
    expect(await screen.findByText('Статус: publishing')).toBeInTheDocument()
  })

  it('незнакомый статус показывается как есть, а прогон считается идущим', async () => {
    renderHarness()

    act(() => stream.emitRun({ status: 'waiting_for_quota' }))

    expect(await screen.findByText('Статус: waiting_for_quota')).toBeInTheDocument()
    expect(stream.active()).toBe(1)
    expect(fetches).toBe(0)
  })

  it('скрытая вкладка закрывает подписку, возврат открывает её и берёт снимок', async () => {
    renderHarness()

    setVisibility('hidden')
    expect(stream.active()).toBe(0)

    // Пока вкладка была скрыта, прогон перешёл в publishing: снимок после open это покажет.
    serverRun = makeReviewRun({ status: 'publishing' })
    setVisibility('visible')
    expect(stream.active()).toBe(1)
    act(() => stream.setState('open'))
    expect(await screen.findByText('Статус: publishing')).toBeInTheDocument()
  })

  it('скрытая вкладка не открывает подписку при монтировании', () => {
    setVisibility('hidden')
    renderHarness()

    expect(stream.opened).toEqual([])
  })

  it('обрыв дольше 5 секунд показывает плашку, данные остаются', () => {
    vi.useFakeTimers()
    renderHarness()

    act(() => stream.setState('reconnecting'))
    act(() => {
      vi.advanceTimersByTime(4_999)
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Соединение потеряно, переподключаемся')
    expect(screen.getByText('Статус: analysing')).toBeInTheDocument()
  })

  it('короткий обрыв плашку не показывает', () => {
    vi.useFakeTimers()
    renderHarness()

    act(() => stream.setState('reconnecting'))
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    act(() => stream.setState('open'))
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('отказ сервера: сообщение и «Обновить», который перезапрашивает прогон один раз', async () => {
    const user = userEvent.setup()
    renderHarness()

    act(() => stream.setState('failed'))
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось получить обновления статуса')

    await user.click(screen.getByRole('button', { name: 'Обновить' }))

    await waitFor(() => expect(stream.opened).toHaveLength(2))
    expect(fetches).toBe(1)
    expect(stream.active()).toBe(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('отказ потока при истёкшей сессии: `/auth/me` отвечает 401 и уводит на вход', async () => {
    window.history.pushState({}, '', '/app/reviews/run-1')
    const calls = stubFetch({ 'GET /api/v1/auth/me': { status: 401 } })
    renderHarness()

    act(() => stream.setState('failed'))

    await waitFor(() =>
      expect(navigation.assign).toHaveBeenCalledWith('/login?redirect=%2Fapp%2Freviews%2Frun-1'),
    )
    expect(calls.map((call) => call.url)).toEqual(['/api/v1/auth/me'])
  })

  it('отказ потока при живой сессии: на вход не уводит, остаётся «Обновить»', async () => {
    const calls = stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    renderHarness()

    act(() => stream.setState('failed'))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].url).toBe('/api/v1/auth/me')
    expect(navigation.assign).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Обновить' })).toBeInTheDocument()
  })

  it('без отказа потока сессию не проверяет', () => {
    const calls = stubFetch({})
    renderHarness()

    act(() => stream.setState('open'))
    act(() => stream.setState('reconnecting'))

    expect(calls).toHaveLength(0)
  })

  it('«Обновить» не открывает подписку, если прогон за это время завершился', async () => {
    const user = userEvent.setup()
    renderHarness()
    act(() => stream.setState('failed'))
    serverRun = makeReviewRun({ status: 'completed' })

    await user.click(screen.getByRole('button', { name: 'Обновить' }))

    await waitFor(() => expect(screen.getByText('Статус: completed')).toBeInTheDocument())
    expect(fetches).toBe(1)
    expect(stream.active()).toBe(0)
    expect(stream.opened).toHaveLength(1)
  })

  it('помнит последний этап, который видел', async () => {
    renderHarness({ status: 'building_context' })
    expect(screen.getByText('Виденный этап: building_context')).toBeInTheDocument()

    act(() => stream.emitRun({ status: 'analysing' }))
    serverRun = makeReviewRun({ status: 'failed', failure_reason: 'сбой' })
    act(() => stream.emitRun({ status: 'failed' }, 'run.finished'))

    expect(await screen.findByText('Статус: failed')).toBeInTheDocument()
    expect(screen.getByText('Виденный этап: analysing')).toBeInTheDocument()
  })

  it('не видел этапов, если экран открыт уже после сбоя', () => {
    renderHarness({ status: 'failed' })

    expect(screen.getByText('Виденный этап: нет')).toBeInTheDocument()
  })
})
