import { createContext, useContext } from 'react'

/**
 * Состояние соединения с потоком событий. `failed` — сервер ответил не потоком (`401`, `404`),
 * автоматически поток уже не восстановится.
 */
export type StreamState = 'connecting' | 'open' | 'reconnecting' | 'failed'

export type EventStreamHandlers = {
  /** Событие сервера: тип и уже разобранный JSON (или строка, если это не JSON). */
  onEvent: (type: string, data: unknown) => void
  onStateChange: (state: StreamState) => void
}

/**
 * Граница потока событий: `EventSource` и mock реализуют один контракт, как `ApiTransport`.
 * Данные приходят как `unknown` — форму проверяет entity своей схемой.
 */
export type EventStream = {
  /** Открывает поток и возвращает функцию отписки. */
  subscribe: (path: string, handlers: EventStreamHandlers) => () => void
}

type EventSourceStreamOptions = {
  /** Типы событий, которые слушаем: `EventSource` не умеет «все события сразу». */
  eventTypes?: readonly string[]
  baseUrl?: string
}

/**
 * Сколько ждём хоть какое-то событие, прежде чем счесть соединение мёртвым, мс: три пропущенных
 * `ping` (сервер шлёт их раз в 15 секунд). `EventSource` сам не замечает полуоткрытый TCP или
 * сброшенную запись NAT и может держать `OPEN` без единого байта.
 */
export const SILENCE_LIMIT = 45_000

/** Реализация на браузерном `EventSource`: авторизация — cookie сессии, заголовки не нужны. */
export function createEventSourceStream({
  eventTypes = ['status'],
  baseUrl = '',
}: EventSourceStreamOptions = {}): EventStream {
  return {
    subscribe(path, { onEvent, onStateChange }) {
      let source: EventSource | null = null
      let heartbeatTimeout: ReturnType<typeof setTimeout> | undefined
      let stopped = false

      // Любое событие, включая `ping`, доказывает, что поток жив, и отодвигает дедлайн.
      const restartHeartbeatTimeout = () => {
        clearTimeout(heartbeatTimeout)
        heartbeatTimeout = setTimeout(reopen, SILENCE_LIMIT)
      }

      const open = () => {
        const current = new EventSource(`${baseUrl}${path}`, { withCredentials: true })
        source = current
        restartHeartbeatTimeout()

        current.onopen = () => onStateChange('open')
        current.onerror = () => {
          if (current !== source) return
          // CLOSED — браузер сдался (ответ не `text/event-stream`); CONNECTING — переподключится сам.
          if (current.readyState === EventSource.CLOSED) {
            clearTimeout(heartbeatTimeout)
            onStateChange('failed')
          } else {
            onStateChange('reconnecting')
          }
        }
        current.addEventListener('ping', () => {
          if (current === source) restartHeartbeatTimeout()
        })
        for (const type of eventTypes) {
          current.addEventListener(type, (event) => {
            if (current !== source) return
            restartHeartbeatTimeout()
            const raw = (event as MessageEvent<string>).data
            try {
              onEvent(type, JSON.parse(raw))
            } catch {
              // Не JSON — отдаём как есть, схема события отбросит его.
              onEvent(type, raw)
            }
          })
        }
      }

      // Тишина: закрываем мёртвое соединение и открываем новое, его первое событие — снимок.
      const reopen = () => {
        if (stopped) return
        source?.close()
        onStateChange('reconnecting')
        open()
      }

      onStateChange('connecting')
      open()

      return () => {
        stopped = true
        clearTimeout(heartbeatTimeout)
        source?.close()
      }
    },
  }
}

export const EventStreamContext = createContext<EventStream | null>(null)

export function useEventStream(): EventStream {
  const stream = useContext(EventStreamContext)
  if (!stream) {
    throw new Error('useEventStream вызван вне EventStreamContext')
  }
  return stream
}
