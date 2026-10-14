import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { RepositoriesPage } from '@/pages/RepositoriesPage'

function renderRepositoriesPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RepositoriesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RepositoriesPage', () => {
  it('показывает состояние загрузки, пока список грузится', () => {
    const { container } = renderRepositoriesPage()

    expect(container.querySelector('.ant-spin-spinning')).toBeInTheDocument()
    expect(screen.queryByText('larchanka-training/platform-api')).not.toBeInTheDocument()
  })

  it('отображает подключённые репозитории из mock-адаптера', async () => {
    renderRepositoriesPage()

    expect(await screen.findByText('larchanka-training/platform-api')).toBeInTheDocument()
    expect(screen.getByText('larchanka-training/docs')).toBeInTheDocument()
    expect(screen.getByText('Синхронизация')).toBeInTheDocument()
    expect(screen.getByText('Подключён')).toBeInTheDocument()
    // Время — общим форматтером `shared/lib`, как на экране прогона.
    expect(screen.getByText('28.09.2026, 08:30 UTC')).toBeInTheDocument()
  })
})
