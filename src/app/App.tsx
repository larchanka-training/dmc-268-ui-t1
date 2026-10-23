import { useState } from 'react'

import {
  createEventSourceStream,
  createHttpTransport,
  type ApiTransport,
  type EventStream,
} from '../shared/api'
import { RUN_EVENT_TYPES } from '../entities/review-run'
import { USE_MOCK_API } from '../shared/config/env'
import { createMockAdapter } from './mocks/mockAdapter'
import { createScenarioEventStream } from './mocks/mockEventStream'
import { createMockServer } from './mocks/mockServer'
import { AppProviders } from './providers/AppProviders'
import { AppRouter } from './router/AppRouter'

type Props = {
  /** Источник данных; по умолчанию — по `VITE_USE_MOCK_API`. */
  transport?: ApiTransport
  eventStream?: EventStream
  useMockApi?: boolean
}

/**
 * Mock adapter и сценарный поток или HTTP-клиент и `EventSource`: экраны ходят только через
 * `ApiTransport` и `EventStream`, поэтому переход на бэкенд — смена флага, а не правка экранов.
 */
function createDataSources(useMockApi: boolean): { transport: ApiTransport; stream: EventStream } {
  if (!useMockApi)
    return {
      transport: createHttpTransport(),
      stream: createEventSourceStream({ eventTypes: RUN_EVENT_TYPES }),
    }
  // Adapter и поток читают одно состояние «сервера», иначе перезапрос после завершения вернул бы
  // старый статус и подписка открывалась бы по кругу.
  const server = createMockServer()
  return {
    transport: createMockAdapter({ server }),
    stream: createScenarioEventStream(server),
  }
}

export function App({ transport, eventStream, useMockApi = USE_MOCK_API }: Props) {
  const [sources] = useState(() => createDataSources(useMockApi))
  const adapter = transport ?? sources.transport
  const stream = eventStream ?? sources.stream
  return (
    <AppProviders transport={adapter} eventStream={stream}>
      <AppRouter />
    </AppProviders>
  )
}
