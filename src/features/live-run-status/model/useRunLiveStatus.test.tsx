import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyRunEvent,
  mergeRunSnapshot,
  type ReviewRun,
  type ReviewRunListItem,
} from '../../../entities/review-run'
import { EventStreamContext } from '../../../shared/api'
import { navigation } from '../../../shared/lib'
import { ME, stubFetch } from '../../../test/api'
import { createFakeEventStream, type FakeEventStream } from '../../../test/fakeEventStream'
import { makeReviewRun } from '../../../test/factories'
import { ConnectionNotice } from '../ui/ConnectionNotice'
import { useRunLiveStatus } from './useRunLiveStatus'

type CacheData = { run: ReviewRun }

const queryKey = ['live-test'] as const
const diffKey = [...queryKey, 'diff'] as const
const patchCache = (data: CacheData, event: ReviewRunListItem): CacheData => ({
  run: applyRunEvent(data.run, event),
})
// Как у запроса прогона на экране: снимок старше кэша не откатывает статус.
const keepNewerStatus = (old: unknown, next: unknown): unknown => ({
  run: mergeRunSnapshot((old as CacheData | undefined)?.run, (next as CacheData).run),
})

let stream: FakeEventStream
let fetches: number
let diffFetches: number
let serverRun: ReviewRun
/** Пока не `null`, ответ на запрос прогона ждёт этого промиса: сервер прочитал, ответ в пути. */
let responseGate: Promise<void> | null

/** Экран в миниатюре: прогон в кэше запроса плюс хук подписки, больше ничего. */
function Harness() {
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<CacheData> => {
      fetches += 1
      const snapshot = serverRun
      if (responseGate) await responseGate
      return { run: snapshot }
    },
    staleTime: Infinity,
    structuralSharing: keepNewerStatus,
  })
  // Дифф живёт под ключом, который начинается с ключа прогона, как на экране.
  useQuery({
    queryKey: diffKey,
    queryFn: async () => {
      diffFetches += 1
      return 'diff'
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
      <p>Токены: {run?.tokens_used}</p>
      <p>Виденный этап: {live.seenStage ?? 'нет'}</p>
      <ConnectionNotice state={live.streamState} onRefresh={live.refresh} />
    </div>
  )
}

function renderHarness(initial: Partial<ReviewRun> = { status: 'analysing' }) {
  serverRun = makeReviewRun(initial)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData<CacheData>(queryKey, { run: serverRun })
  queryClient.setQueryData(diffKey, 'diff')
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
    diffFetches = 0
    responseGate = null
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

  it('снимок на open перезапрашивает только прогон, не дифф и шаги', async () => {
    renderHarness()

    act(() => stream.setState('open'))

    await waitFor(() => expect(fetches).toBe(1))
    expect(diffFetches).toBe(0)
  })

  it('снимок, прочитанный до события, не откатывает статус, остальное из него применяется', async () => {
    renderHarness({ status: 'building_context', tokens_used: 1 })
    let respond = () => {}
    responseGate = new Promise((resolve) => {
      respond = resolve
    })

    // Сервер прочитал прогон в building_context, ответ ещё в пути.
    serverRun = makeReviewRun({ status: 'building_context', tokens_used: 42 })
    act(() => stream.setState('open'))
    await waitFor(() => expect(fetches).toBe(1))

    // Пока ответ в пути, пришло событие с большим `updated_at`.
    act(() => stream.emitRun({ status: 'analysing', last_progress_at: '2026-09-20T14:10:00Z' }))
    expect(await screen.findByText('Статус: analysing')).toBeInTheDocument()

    await act(async () => respond())

    expect(await screen.findByText('Токены: 42')).toBeInTheDocument()
    expect(screen.getByText('Статус: analysing')).toBeInTheDocument()
    expect(screen.getByText('Прогресс: 2026-09-20T14:10:00Z')).toBeInTheDocument()
    expect(screen.getByText('Виденный этап: analysing')).toBeInTheDocument()
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

  it('run.finished закрывает подписку, даже если кэш после него не терминальный', async () => {
    renderHarness()

    // Событие старше кэша: `patchCache` его отбросит, статус в кэше останется analysing.
    act(() =>
      stream.emitRun({ status: 'completed', updated_at: '2026-09-20T14:06:00Z' }, 'run.finished'),
    )

    await waitFor(() => expect(fetches).toBe(1))
    expect(screen.getByText('Статус: analysing')).toBeInTheDocument()
    expect(stream.active()).toBe(0)
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

  it('источник событий на сервере недоступен: цикл переподключений раз в 3 с — снимок на каждый open, без плашки', async () => {
    vi.useFakeTimers()
    renderHarness()

    // Сервер отвечает потоком из одной строки `retry` и закрывает его: EventSource открывается
    // и через 3 с переподключается снова.
    for (let cycle = 0; cycle < 5; cycle += 1) {
      await act(async () => {
        stream.setState('open')
      })
      act(() => stream.setState('reconnecting'))
      act(() => {
        vi.advanceTimersByTime(3_000)
      })
    }

    expect(fetches).toBe(5)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(stream.active()).toBe(1)
  })

  it('отказ сервера: сообщение и «Обновить», который перезапрашивает прогон один раз', async () => {
    const user = userEvent.setup()
    stream = createFakeEventStream({ autoOpen: true })
    renderHarness()
    await waitFor(() => expect(fetches).toBe(1))

    act(() => stream.setState('failed'))
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось получить обновления статуса')

    await user.click(screen.getByRole('button', { name: 'Обновить' }))

    // Новое соединение открылось и сразу взяло снимок: запрос прогона ровно один.
    await waitFor(() => expect(stream.opened).toHaveLength(2))
    expect(fetches).toBe(2)
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

  it('«Обновить» при прогоне, завершившемся за это время: снимок после open закрывает подписку', async () => {
    const user = userEvent.setup()
    stream = createFakeEventStream({ autoOpen: true })
    renderHarness()
    await waitFor(() => expect(fetches).toBe(1))
    act(() => stream.setState('failed'))
    serverRun = makeReviewRun({ status: 'completed' })

    await user.click(screen.getByRole('button', { name: 'Обновить' }))

    expect(await screen.findByText('Статус: completed')).toBeInTheDocument()
    expect(fetches).toBe(2)
    expect(stream.opened).toHaveLength(2)
    expect(stream.active()).toBe(0)
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
