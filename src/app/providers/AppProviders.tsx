import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
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
      {/* Волна при клике — лишний шум в плотном интерфейсе диффа, где кнопок десятки. */}
      <ConfigProvider locale={ruRU} wave={{ disabled: true }}>
        <TransportContext value={transport}>{children}</TransportContext>
      </ConfigProvider>
    </QueryClientProvider>
  )
}
