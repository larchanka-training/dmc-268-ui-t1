import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { StyleProvider } from '@ant-design/cssinjs'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { useState, type ReactNode } from 'react'
import {
  EventStreamContext,
  TransportContext,
  type ApiTransport,
  type EventStream,
} from '@/shared/api'
import { createQueryClient } from '@/app/providers/queryClient'
import { ThemeProvider, useAppTheme } from '@/features/theme'

type Props = {
  transport: ApiTransport
  eventStream: EventStream
  queryClient?: QueryClient
  children: ReactNode
}

function ThemedApplication({ children }: { children: ReactNode }) {
  const { antdTheme } = useAppTheme()
  return (
    <ConfigProvider theme={antdTheme} locale={ruRU} wave={{ disabled: true }}>
      {children}
    </ConfigProvider>
  )
}

export function AppProviders({ transport, eventStream, queryClient, children }: Props) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  return (
    <QueryClientProvider client={client}>
      {/* Стили antd — в слое `antd`, ниже `utilities`: иначе они перебивают классы Tailwind. */}
      <StyleProvider layer>
        <ThemeProvider>
          <ThemedApplication>
            <TransportContext value={transport}>
              <EventStreamContext value={eventStream}>{children}</EventStreamContext>
            </TransportContext>
          </ThemedApplication>
        </ThemeProvider>
      </StyleProvider>
    </QueryClientProvider>
  )
}
