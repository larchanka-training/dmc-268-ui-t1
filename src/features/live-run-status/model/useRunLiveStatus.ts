import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

import {
  isRunEventType,
  isRunStage,
  isTerminalStatus,
  ReviewRunListItemSchema,
  type ReviewRunListItem,
  type RunStage,
} from '../../../entities/review-run'
import { fetchCurrentUser } from '../../../entities/session'
import { ContractError, useEventStream, type StreamState } from '../../../shared/api'
import { API_V1_BASE_URL } from '../../../shared/config/env'

type Options<TData> = {
  runId: string
  /** Статус прогона из кэша: терминальный — подписка не открывается. */
  status: string
  /** Ключ запроса, в кэше которого живёт прогон; должен быть стабильным между рендерами. */
  queryKey: QueryKey
  /**
   * Накладывает событие прогона на данные кэша; чистая функция, стабильная между рендерами.
   * Событие старше данных в кэше (`updated_at`) она должна отбросить.
   */
  patchCache: (data: TData, event: ReviewRunListItem) => TData
}

export type RunLiveStatus = {
  streamState: StreamState
  /** Последний этап, который экран видел у этого прогона; `null` — не видел ни одного. */
  seenStage: RunStage | null
  /** «Обновить» после отказа сервера: один раз перезапрашивает прогон и открывает поток заново. */
  refresh: () => Promise<void>
}

/**
 * Путь общего потока событий кабинета: один на все прогоны, без параметров. База API — из
 * `API_V1_BASE_URL`, как у остальных запросов.
 */
export const EVENTS_PATH = `${API_V1_BASE_URL}/events`

/**
 * Держит статус прогона на экране свежим через SSE, пока прогон не завершён. Источник правды —
 * кэш запроса прогона: события только патчат его, второго состояния нет. Поток общий: экран
 * берёт из него события `run.*` своего прогона, остальное пропускает. Истории у потока нет, поэтому
 * на каждое открытие соединения, первое и после обрыва, прогон перезапрашивается снимком REST;
 * опроса по таймеру нет.
 */
export function useRunLiveStatus<TData>({
  runId,
  status,
  queryKey,
  patchCache,
}: Options<TData>): RunLiveStatus {
  const stream = useEventStream()
  const queryClient = useQueryClient()
  const terminal = isTerminalStatus(status)

  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden')
  const [streamState, setStreamState] = useState<StreamState>('connecting')
  // Номер ручного переподключения: меняется после «Обновить» и заставляет эффект открыть поток.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const onVisibilityChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // Последний виденный этап нужен, чтобы показать место сбоя, если бэкенд `failed_stage` не дал.
  const currentStage = isRunStage(status) ? status : null
  const [seen, setSeen] = useState({ runId, stage: currentStage })
  if (seen.runId !== runId || (currentStage !== null && currentStage !== seen.stage)) {
    setSeen({ runId, stage: currentStage })
  }
  const seenStage = seen.runId === runId ? seen.stage : currentStage

  useEffect(() => {
    // Завершённому прогону события не нужны, скрытой вкладке — тоже: при возврате придёт снимок.
    if (terminal || !visible) return

    let finished = false
    let unsubscribe: (() => void) | null = null
    const close = () => {
      finished = true
      unsubscribe?.()
      unsubscribe = null
    }
    unsubscribe = stream.subscribe(EVENTS_PATH, {
      onStateChange: (state) => {
        setStreamState(state)
        // Пропущенное до открытия и за время обрыва поток не повторит: берём снимок прогона.
        // Событие, пришедшее раньше снимка, не потеряется, а более старая версия проиграет по
        // `updated_at` в `patchCache`. Только сам прогон (`exact`): ключи диффа и шагов
        // начинаются с его ключа, а перекачивать дифф на каждое переподключение незачем.
        if (state === 'open' && !finished) {
          void queryClient.invalidateQueries({ queryKey, exact: true })
        }
      },
      onEvent: (type, data) => {
        // Незнакомые типы — не ошибка: контракт разрешает серверу добавлять новые.
        if (finished || !isRunEventType(type)) return
        const parsed = ReviewRunListItemSchema.safeParse(data)
        if (!parsed.success) {
          // Событие вне схемы не меняет экран и не рвёт подписку.
          console.error(new ContractError(`${EVENTS_PATH} ${type}`, parsed.error.message))
          return
        }
        const event = parsed.data
        if (event.id !== runId) return
        // Этап запоминаем по самому событию: два быстрых события подряд могут слиться в один рендер.
        if (isRunStage(event.status)) setSeen({ runId, stage: event.status })
        queryClient.setQueryData<TData>(queryKey, (old) =>
          old === undefined ? old : patchCache(old, event),
        )
        if (type === 'run.finished') {
          // Замечания, вердикт и причина сбоя приходят только в самом прогоне: берём их одним
          // запросом, а поток прогону больше не нужен.
          close()
          void queryClient.invalidateQueries({ queryKey })
        }
      },
    })
    if (finished) unsubscribe()
    return close
  }, [stream, queryClient, queryKey, patchCache, runId, terminal, visible, attempt])

  useEffect(() => {
    // `EventSource` не отдаёт статус ответа, и `401` на потоке неотличим от прочих отказов.
    // Сессию проверяет `apiFetch`: при `401` он сам уводит на `/login`, при живой сессии
    // остаётся «Обновить».
    if (streamState !== 'failed') return
    fetchCurrentUser().catch(() => {
      // `401` уже обработан уводом на вход, прочие ошибки не отменяют «Обновить».
    })
  }, [streamState])

  const refresh = useCallback(async () => {
    setStreamState('connecting')
    await queryClient.invalidateQueries({ queryKey })
    setAttempt((value) => value + 1)
  }, [queryClient, queryKey])

  return { streamState, seenStage, refresh }
}
