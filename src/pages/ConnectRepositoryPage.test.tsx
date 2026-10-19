import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ConnectRepositoryPage } from '@/pages/ConnectRepositoryPage'
import { RepositoriesPage } from '@/pages/RepositoriesPage'
import type { AvailableRepository, ConnectedRepository } from '@/entities/repository'

// Задержки API (350–500 мс) в сумме подходят к таймауту findBy в 1 с, и на раннере CI тест падал
// на ожидании заголовка. Тест проверяет переход и обновление списка, а не ожидание, поэтому
// функции API подменяем на публичном входе слайса: они отвечают сразу, данные объявлены здесь.
// Остальной экспорт слайса (типы, repositoryStatusLabel) остаётся настоящим.
const testData = vi.hoisted(() => ({
  connected: [] as ConnectedRepository[],
  pool: [] as AvailableRepository[],
}))

function available(id: string, name: string): AvailableRepository {
  return {
    id,
    name,
    fullName: `larchanka-training/${name}`,
    provider: 'github',
    defaultBranch: 'main',
    private: false,
    alreadyConnected: false,
  }
}

function connected(
  repo: AvailableRepository,
  status: ConnectedRepository['status'],
): ConnectedRepository {
  const { id, name, fullName, provider, defaultBranch } = repo
  return {
    id,
    name,
    fullName,
    provider,
    defaultBranch,
    private: repo.private,
    connectedAt: '2026-10-01T10:00:00.000Z',
    status,
  }
}

vi.mock('@/entities/repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/repository')>()),
  fetchConnectedRepositories: async () => [...testData.connected],
  fetchAvailableRepositories: async () =>
    testData.pool.map((r) => ({
      ...r,
      alreadyConnected: testData.connected.some((c) => c.fullName === r.fullName),
    })),
  connectRepositoryById: async (repoId: string) => {
    const candidate = testData.pool.find((r) => r.id === repoId)
    if (!candidate) throw new Error('Репозиторий не найден')
    const repo = { ...connected(candidate, 'connected'), id: `repo-${repoId}` }
    testData.connected = [repo, ...testData.connected]
    return repo
  },
}))

beforeEach(() => {
  testData.pool = [
    available('avail-1', 'docs'),
    available('avail-2', 'mobile-app'),
    available('avail-3', 'infra'),
  ]
  testData.connected = [{ ...connected(testData.pool[0], 'syncing'), id: 'repo-1' }]
})

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
