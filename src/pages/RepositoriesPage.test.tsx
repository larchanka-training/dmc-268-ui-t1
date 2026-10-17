import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RepositoriesPage } from '@/pages/RepositoriesPage'
import { RepositorySettingsPage } from '@/pages/RepositorySettingsPage'

function renderRepositoriesPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/repositories']}>
        <Routes>
          <Route path="/repositories" element={<RepositoriesPage />} />
          <Route path="/repositories/:repositoryId/settings" element={<RepositorySettingsPage />} />
        </Routes>
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
    expect(screen.getByText('larchanka-training/design-system')).toBeInTheDocument()
    expect(screen.getByText('Синхронизация')).toBeInTheDocument()
    // repo-1 и repo-3 подключены, repo-2 синхронизируется.
    expect(screen.getAllByText('Подключён')).toHaveLength(2)
  })

  it('из списка открывает экран настроек репозитория', async () => {
    const user = userEvent.setup()
    renderRepositoriesPage()

    const [settingsLink] = await screen.findAllByRole('link', { name: 'Настройки' })
    await user.click(settingsLink)

    expect(await screen.findByText('Настройки репозитория')).toBeInTheDocument()
    expect(screen.getByText('larchanka-training/platform-api')).toBeInTheDocument()
  })
})
