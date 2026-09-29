import { useState } from 'react'

import type { ApiTransport } from '../shared/api'
import { createMockAdapter } from './mocks/mockAdapter'
import { AppProviders } from './providers/AppProviders'
import { ReviewRunView } from './ReviewRunView'

type Props = {
  /** До backend-контракта интерфейс работает на mock adapter (FE-DEC-06). */
  transport?: ApiTransport
}

export function App({ transport }: Props) {
  const [adapter] = useState(() => transport ?? createMockAdapter())
  return (
    <AppProviders transport={adapter}>
      <ReviewRunView />
    </AppProviders>
  )
}
