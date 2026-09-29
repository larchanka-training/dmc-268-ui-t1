import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { useState, type ReactNode } from 'react'
import { AuthProvider } from '@/features/auth'
import { ThemeProvider, useAppTheme } from '@/features/theme'
import { AppRouter } from '@/app/router/AppRouter'

function ThemedApplication({ children }: { children: ReactNode }) {
  const { antdTheme } = useAppTheme()
  return (
    <ConfigProvider theme={antdTheme} locale={ruRU}>
      <AuthProvider>{children}</AuthProvider>
    </ConfigProvider>
  )
}

export function AppProviders() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedApplication>
          <AppRouter />
        </ThemedApplication>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
