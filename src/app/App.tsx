import { useState } from 'react'

import type { ApiTransport, EventStream } from '../shared/api'
import { createMockAdapter } from './mocks/mockAdapter'
import { createScenarioEventStream } from './mocks/mockEventStream'
import { createMockServer } from './mocks/mockServer'
import { AppProviders } from './providers/AppProviders'
import { AppRouter } from './router/AppRouter'

type Props = {
  /** До backend-контракта интерфейс работает на mock adapter (FE-DEC-06). */
  transport?: ApiTransport
  /** До SSE-эндпоинта бэкенда статусы проигрывает сценарий; `createEventSourceStream` — замена. */
  eventStream?: EventStream
}

export function App({ transport, eventStream }: Props) {
  // Adapter и поток читают одно состояние «сервера», иначе перезапрос после завершения вернул бы
  // старый статус и подписка открывалась бы по кругу.
  const [server] = useState(() => createMockServer())
  const [adapter] = useState(() => transport ?? createMockAdapter({ server }))
  const [stream] = useState(() => eventStream ?? createScenarioEventStream(server))
  return (
    <AppProviders transport={adapter} eventStream={stream}>
      <AppRouter />
    </AppProviders>
  )
}
