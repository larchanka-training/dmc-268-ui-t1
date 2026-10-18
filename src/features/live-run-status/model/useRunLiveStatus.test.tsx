import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { applyStatusEvent, type ReviewRun, type RunStatusEvent } from '../../../entities/review-run'
import { EventStreamContext } from '../../../shared/api'
import { navigation } from '../../../shared/lib'
import { ME, stubFetch } from '../../../test/api'
import { createFakeEventStream, type FakeEventStream } from '../../../test/fakeEventStream'
import { makeReviewRun } from '../../../test/factories'
import { ConnectionNotice } from '../ui/ConnectionNotice'
import { useRunLiveStatus } from './useRunLiveStatus'

type CacheData = { run: ReviewRun }

const queryKey = ['live-test'] as const
const patchCache = (data: CacheData, event: RunStatusEvent): CacheData => ({
  run: applyStatusEvent(data.run, event),
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
      <p>Замечание: {run?.failure_reason ?? 'нет'}</p>
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

  it('смена статуса по событию показывается без перезагрузки', async () => {
    renderHarness()

    act(() => stream.emitStatus({ status: 'publishing' }))

    expect(await screen.findByText('Статус: publishing')).toBeInTheDocument()
    expect(fetches).toBe(0)
    expect(stream.opened).toEqual(['/api/v1/reviews/run-1/events'])
  })

  it.each(['completed', 'failed', 'cancelled'])(
    'для прогона в статусе %s подписка не открывается',
    (status) => {
      renderHarness({ status })

      expect(stream.opened).toEqual([])
    },
  )

  it('терминальный статус: один перезапрос прогона и закрытая подписка', async () => {
    renderHarness()
    serverRun = makeReviewRun({ status: 'completed' })

    act(() => stream.emitStatus({ status: 'completed' }))

    await waitFor(() => expect(fetches).toBe(1))
    expect(screen.getByText('Статус: completed')).toBeInTheDocument()
    expect(stream.active()).toBe(0)
    // Запоздавшие события после завершения запросов не плодят.
    act(() => stream.emitStatus({ status: 'completed' }))
    expect(fetches).toBe(1)
  })

  it('два терминальных события подряд перезапрашивают прогон один раз', async () => {
    renderHarness()
    serverRun = makeReviewRun({ status: 'completed' })

    act(() => {
      stream.emitStatus({ status: 'completed' })
      stream.emitStatus({ status: 'completed' })
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

  it('переход, пропущенный во время обрыва, наверстывается снимком нового потока', async () => {
    renderHarness({ status: 'building_context' })

    act(() => stream.setState('reconnecting'))
    expect(screen.getByText('Статус: building_context')).toBeInTheDocument()
    // Пока обрыв, прогон ушёл вперёд; сервер начинает новый поток со снимка.
    act(() => stream.setState('connecting'))
    act(() => stream.setState('open'))
    act(() => stream.emitStatus({ status: 'analysing' }))

    expect(await screen.findByText('Статус: analysing')).toBeInTheDocument()
    expect(screen.getByText('Виденный этап: analysing')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(stream.opened).toHaveLength(1)
    expect(fetches).toBe(0)
  })

  it('событие вне схемы отбрасывается: экран не меняется, подписка жива', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderHarness()

    act(() => stream.emit('status', { review_run_id: 'run-1', last_progress_at: null }))

    expect(screen.getByText('Статус: analysing')).toBeInTheDocument()
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ name: 'ContractError' }))
    expect(stream.active()).toBe(1)

    act(() => stream.emitStatus({ status: 'publishing' }))
    expect(await screen.findByText('Статус: publishing')).toBeInTheDocument()
  })

  it('незнакомый статус показывается как есть, а прогон считается идущим', async () => {
    renderHarness()

    act(() => stream.emitStatus({ status: 'waiting_for_quota' }))

    expect(await screen.findByText('Статус: waiting_for_quota')).toBeInTheDocument()
    expect(stream.active()).toBe(1)
    expect(fetches).toBe(0)
  })

  it('скрытая вкладка закрывает подписку, возврат открывает её и берёт снимок', async () => {
    renderHarness()

    setVisibility('hidden')
    expect(stream.active()).toBe(0)

    setVisibility('visible')
    expect(stream.active()).toBe(1)
    // Пока вкладка была скрыта, прогон перешёл в publishing: первое событие — снимок.
    act(() => stream.emitStatus({ status: 'publishing' }))
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

    act(() => stream.emitStatus({ status: 'analysing' }))
    serverRun = makeReviewRun({ status: 'failed' })
    act(() => stream.emitStatus({ status: 'failed', failure_reason: 'сбой' }))

    expect(await screen.findByText('Статус: failed')).toBeInTheDocument()
    expect(screen.getByText('Виденный этап: analysing')).toBeInTheDocument()
  })

  it('не видел этапов, если экран открыт уже после сбоя', () => {
    renderHarness({ status: 'failed' })

    expect(screen.getByText('Виденный этап: нет')).toBeInTheDocument()
  })
})
