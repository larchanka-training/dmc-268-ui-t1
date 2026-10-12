import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

import {
  isRunStage,
  isTerminalStatus,
  RunStatusEventSchema,
  type RunStage,
  type RunStatusEvent,
} from '../../../entities/review-run'
import { ContractError, useEventStream, type StreamState } from '../../../shared/api'

type Options<TData> = {
  runId: string
  /** Статус прогона из кэша: терминальный — подписка не открывается. */
  status: string
  /** Ключ запроса, в кэше которого живёт прогон; должен быть стабильным между рендерами. */
  queryKey: QueryKey
  /** Накладывает событие на данные кэша; чистая функция, стабильная между рендерами. */
  patchCache: (data: TData, event: RunStatusEvent) => TData
}

export type RunLiveStatus = {
  streamState: StreamState
  /** Последний этап, который экран видел у этого прогона; `null` — не видел ни одного. */
  seenStage: RunStage | null
  /** «Обновить» после отказа сервера: один раз перезапрашивает прогон и открывает поток заново. */
  refresh: () => Promise<void>
}

export function eventsPath(runId: string): string {
  return `/api/v1/reviews/${runId}/events`
}

/**
 * Держит статус прогона на экране свежим через SSE, пока прогон не завершён. Источник правды —
 * кэш запроса прогона: события только патчат его, второго состояния нет. Опроса по таймеру нет:
 * каждое подключение начинается со снимка статуса, так что пропущенное при обрыве не теряется.
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

    const path = eventsPath(runId)
    let finished = false
    return stream.subscribe(path, {
      onStateChange: setStreamState,
      onEvent: (type, data) => {
        if (finished || type !== 'status') return
        const parsed = RunStatusEventSchema.safeParse(data)
        if (!parsed.success) {
          // Событие вне схемы не меняет экран и не рвёт подписку.
          console.error(new ContractError(path, parsed.error.message))
          return
        }
        const event = parsed.data
        // Этап запоминаем по самому событию: два быстрых события подряд могут слиться в один рендер.
        if (isRunStage(event.status)) setSeen({ runId, stage: event.status })
        queryClient.setQueryData<TData>(queryKey, (old) =>
          old === undefined ? old : patchCache(old, event),
        )
        if (isTerminalStatus(event.status)) {
          // Замечания, вердикт и метаданные приходят только в самом прогоне: берём их одним
          // запросом, а подписку закроет эффект, когда кэш покажет терминальный статус.
          finished = true
          void queryClient.invalidateQueries({ queryKey })
        }
      },
    })
  }, [stream, queryClient, queryKey, patchCache, runId, terminal, visible, attempt])

  const refresh = useCallback(async () => {
    setStreamState('connecting')
    await queryClient.invalidateQueries({ queryKey })
    setAttempt((value) => value + 1)
  }, [queryClient, queryKey])

  return { streamState, seenStage, refresh }
}
