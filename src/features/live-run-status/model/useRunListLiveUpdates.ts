import { hashKey, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  isRunEventType,
  ReviewRunListItemSchema,
  upsertRunListItem,
  type ReviewRunListItem,
  type ReviewRunListPage,
} from '../../../entities/review-run'
import { fetchCurrentUser } from '../../../entities/session'
import { ContractError, useEventStream, type StreamState } from '../../../shared/api'
import { EVENTS_PATH } from './useRunLiveStatus'

/** Не чаще одного перезапроса страницы за это время, мс: пачка событий даёт один-два запроса. */
export const LIST_REFETCH_THROTTLE = 1_000

type Options = {
  /** Подписка нужна, только когда список загрузился: при `501` и до первого ответа потока нет. */
  enabled: boolean
  /** Ключ текущей страницы списка. */
  queryKey: QueryKey
  /** Корень ключей всех страниц: на событие они помечаются устаревшими без перезапроса. */
  listKey: QueryKey
  /**
   * Страницу можно обновлять из события на месте: первая страница без фильтров. Иначе поток,
   * который фильтров не учитывает, не скажет, попадает ли прогон на страницу, — она перезапрашивается.
   */
  canUpsert: boolean
  pageSize: number
}

export type RunListLiveUpdates = {
  streamState: StreamState
  /** «Обновить» после отказа сервера: перезапрашивает страницу и открывает поток заново. */
  refresh: () => Promise<void>
}

/** События, пришедшие, пока страница в режиме upsert грузилась: их накладывают на её снимок. */
type PendingEvents = { queryKey: QueryKey; pageSize: number; events: ReviewRunListItem[] }

/**
 * Держит список прогонов свежим по общему потоку `GET /api/v1/events`. Источник правды — кэш
 * запроса страницы: событие `run.*` либо накладывается на него (`upsertRunListItem`), либо
 * вызывает перезапрос страницы с троттлингом. Истории у потока нет: на каждое `open`, первое и
 * после обрыва, страница перезапрашивается. Незнакомые типы событий пропускаются, событие вне
 * схемы пишется в консоль и подписку не рвёт.
 *
 * Гонка снимка и события в режиме upsert: ответ запроса, прочитанный сервером до события, не
 * должен его отменить. Строку, которая есть и в кэше, и в снимке, защищает `structuralSharing`
 * запроса (побеждает больший `updated_at`). Событие, пришедшее, пока страница в полёте или ещё
 * не загружена, кроме того, запоминается и после успешного ответа накладывается на снимок
 * заново: так не пропадают `run.created`, которого в снимке нет, и событие, пришедшее, когда
 * под ключом страницы данных ещё не было.
 */
export function useRunListLiveUpdates({
  enabled,
  queryKey,
  listKey,
  canUpsert,
  pageSize,
}: Options): RunListLiveUpdates {
  const stream = useEventStream()
  const queryClient = useQueryClient()
  const [streamState, setStreamState] = useState<StreamState>('connecting')
  const [attempt, setAttempt] = useState(0)

  // Страница и фильтры меняются, а подписка остаётся одной: обработчик читает их отсюда.
  const current = useRef({ queryKey, listKey, canUpsert, pageSize })
  useEffect(() => {
    current.current = { queryKey, listKey, canUpsert, pageSize }
  })

  useEffect(() => {
    if (!enabled) return

    let finished = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastRefetch = -Infinity
    const pending = new Map<string, PendingEvents>()

    // Снимок страницы пришёл — накладываем на него события, пришедшие за время загрузки.
    // `manual` — это запись `setQueryData`, а не ответ сервера: её пропускаем.
    const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return
      const entry = pending.get(event.query.queryHash)
      if (entry === undefined) return
      const { action } = event
      if (action.type === 'error') {
        pending.delete(event.query.queryHash)
        return
      }
      if (action.type !== 'success' || action.manual) return
      pending.delete(event.query.queryHash)
      queryClient.setQueryData<ReviewRunListPage>(entry.queryKey, (page) =>
        page === undefined
          ? page
          : entry.events.reduce((acc, run) => upsertRunListItem(acc, run, entry.pageSize), page),
      )
    })

    const remember = (key: QueryKey, size: number, run: ReviewRunListItem) => {
      const state = queryClient.getQueryState(key)
      if (state?.data !== undefined && state.fetchStatus !== 'fetching') return
      const hash = hashKey(key)
      const entry = pending.get(hash) ?? { queryKey: key, pageSize: size, events: [] }
      entry.events.push(run)
      pending.set(hash, entry)
    }

    const refetchNow = () => {
      lastRefetch = Date.now()
      void queryClient.invalidateQueries({ queryKey: current.current.queryKey, exact: true })
    }
    // Первый перезапрос — сразу, следующие в пределах окна сливаются в один в конце окна.
    const refetch = () => {
      if (timer !== undefined) return
      const wait = lastRefetch + LIST_REFETCH_THROTTLE - Date.now()
      if (wait <= 0) {
        refetchNow()
        return
      }
      timer = setTimeout(() => {
        timer = undefined
        if (!finished) refetchNow()
      }, wait)
    }

    const unsubscribe = stream.subscribe(EVENTS_PATH, {
      onStateChange: (state) => {
        if (finished) return
        setStreamState(state)
        // Пропущенное до открытия и за время обрыва поток не повторит: берём снимок страницы.
        if (state === 'open') refetch()
      },
      onEvent: (type, data) => {
        // Незнакомые типы — не ошибка: контракт разрешает серверу добавлять новые.
        if (finished || !isRunEventType(type)) return
        const parsed = ReviewRunListItemSchema.safeParse(data)
        if (!parsed.success) {
          console.error(new ContractError(`${EVENTS_PATH} ${type}`, parsed.error.message))
          return
        }
        const { queryKey: key, listKey: root, canUpsert: upsert, pageSize: size } = current.current
        // Другие страницы и фильтры из кэша устарели: при возврате к ним — перезапрос.
        void queryClient.invalidateQueries({ queryKey: root, refetchType: 'none' })
        if (upsert) {
          remember(key, size, parsed.data)
          queryClient.setQueryData<ReviewRunListPage>(key, (old) =>
            old === undefined ? old : upsertRunListItem(old, parsed.data, size),
          )
        } else {
          refetch()
        }
      },
    })

    return () => {
      finished = true
      clearTimeout(timer)
      unsubscribe()
      unsubscribeCache()
    }
  }, [stream, queryClient, enabled, attempt])

  useEffect(() => {
    // Как на экране прогона: `EventSource` не отдаёт статус, сессию проверяет `apiFetch`.
    if (streamState !== 'failed') return
    fetchCurrentUser().catch(() => {
      // `401` уже обработан уводом на вход, прочие ошибки не отменяют «Обновить».
    })
  }, [streamState])

  const refresh = useCallback(async () => {
    setStreamState('connecting')
    await queryClient.invalidateQueries({ queryKey: current.current.queryKey, exact: true })
    setAttempt((value) => value + 1)
  }, [queryClient])

  return { streamState, refresh }
}
