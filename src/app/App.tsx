import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'

import type { ApiTransport } from '../shared/api'
import { createMockTransport } from './mocks/mockTransport'
import { AppProviders } from './providers/AppProviders'
import { routes } from './router/routes'

type Props = {
  /** До готовности API интерфейс работает на mock adapter (FE-CON-06). */
  transport?: ApiTransport
}

export function App({ transport }: Props) {
  const [router] = useState(() => createBrowserRouter(routes))
  const [api] = useState(() => transport ?? createMockTransport())
  return (
    <AppProviders transport={api}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
