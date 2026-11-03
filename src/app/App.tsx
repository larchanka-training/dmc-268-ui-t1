import { useState } from 'react'

import {
  createEventSourceStream,
  createHttpTransport,
  type ApiTransport,
  type EventStream,
} from '../shared/api'
import { RUN_EVENT_TYPES } from '../entities/review-run'
import { AppProviders } from './providers/AppProviders'
import { AppRouter } from './router/AppRouter'

type Props = {
  /** Источник данных; по умолчанию — HTTP-клиент к `/api/v1` и поток на `EventSource`. Тест подменяет оба. */
  transport?: ApiTransport
  eventStream?: EventStream
}

export function App({ transport, eventStream }: Props) {
  // Создаются один раз на жизнь приложения: поток держит соединение, клиент — ничего, но
  // пересоздание на рендере сбивало бы контекст транспорта.
  const [sources] = useState(() => ({
    transport: transport ?? createHttpTransport(),
    stream: eventStream ?? createEventSourceStream({ eventTypes: RUN_EVENT_TYPES }),
  }))
  return (
    <AppProviders transport={sources.transport} eventStream={sources.stream}>
      <AppRouter />
    </AppProviders>
  )
}
