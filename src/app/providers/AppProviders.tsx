import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { TransportContext, type ApiTransport } from '../../shared/api'
import { createQueryClient } from './queryClient'

type Props = {
  transport: ApiTransport
  queryClient?: QueryClient
  children: ReactNode
}

export function AppProviders({ transport, queryClient, children }: Props) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  return (
    <QueryClientProvider client={client}>
      <TransportContext value={transport}>{children}</TransportContext>
    </QueryClientProvider>
  )
}
