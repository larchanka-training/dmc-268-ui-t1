import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ConnectRepositoryPage } from '@/pages/ConnectRepositoryPage'
import { RepositoriesPage } from '@/pages/RepositoriesPage'

function renderConnectPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/repositories/connect']}>
        <Routes>
          <Route path="/repositories/connect" element={<ConnectRepositoryPage />} />
          <Route path="/repositories" element={<RepositoriesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ConnectRepositoryPage', () => {
  it('фильтрует доступные репозитории по имени', async () => {
    renderConnectPage()

    expect(await screen.findByText('larchanka-training/mobile-app')).toBeInTheDocument()
    expect(screen.getByText('larchanka-training/infra')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Поиск по имени…'), {
      target: { value: 'mobile' },
    })

    await waitFor(() => {
      expect(screen.queryByText('larchanka-training/infra')).not.toBeInTheDocument()
      expect(screen.queryByText('larchanka-training/docs')).not.toBeInTheDocument()
    })
    expect(screen.getByText('larchanka-training/mobile-app')).toBeInTheDocument()
  })

  it('подключает репозиторий и обновляет список подключённых', async () => {
    renderConnectPage()

    const row = (await screen.findByText('larchanka-training/mobile-app')).closest('tr')
    expect(row).not.toBeNull()
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: /подключить/i }))

    // После mutation — переход на /repositories и свежий список подключённых.
    expect(await screen.findByText('Репозитории', { selector: '.page-title' })).toBeInTheDocument()
    expect(await screen.findByText('larchanka-training/mobile-app')).toBeInTheDocument()
  })
})
