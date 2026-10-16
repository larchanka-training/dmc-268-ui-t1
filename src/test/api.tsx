import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'

export const ME = {
  provider: 'github',
  login: 'octocat',
  name: 'The Octocat',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231',
}

type Reply = { status: number; body?: unknown } | Error

/** Подменяет `fetch`: ответ выбирается по «МЕТОД путь», вызовы копятся в `calls`. */
export function stubFetch(routes: Record<string, Reply>) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init })
    const reply = routes[`${init.method ?? 'GET'} ${url}`]
    if (!reply) throw new Error(`неожиданный запрос ${init.method ?? 'GET'} ${url}`)
    if (reply instanceof Error) throw reply
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status,
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

export function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}
