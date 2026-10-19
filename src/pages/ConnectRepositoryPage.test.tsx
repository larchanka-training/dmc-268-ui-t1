import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type {
  AvailableRepository,
  ConnectRepositoryRequest,
  Repository,
} from '@/entities/repository'
import { ConnectRepositoryPage } from '@/pages/ConnectRepositoryPage'
import { RepositoriesPage } from '@/pages/RepositoriesPage'
import { ApiError, type ApiTransport } from '@/shared/api'
import { fakeTransport, renderWithTransport } from '@/test/api'

function available(
  provider_id: string,
  name: string,
): Omit<AvailableRepository, 'already_connected'> {
  return {
    provider: 'github',
    provider_id,
    full_name: `larchanka-training/${name}`,
    default_branch: 'main',
  }
}

/** «Бэкенд» в памяти: отвечает в форме контракта, без задержек. */
function createBackend() {
  const pool = [available('1', 'docs'), available('2', 'mobile-app'), available('3', 'infra')]
  let connected: Repository[] = []
  const register = (repo: (typeof pool)[number]) => {
    connected = [
      ...connected,
      {
        ...repo,
        id: `repo-${repo.provider_id}`,
        auto_review_enabled: true,
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-01T10:00:00Z',
      },
    ]
  }
  register(pool[0])
  const transport: ApiTransport = fakeTransport({
    get: async (path) => {
      if (path === '/repositories/available') {
        return {
          items: pool.map((repo) => ({
            ...repo,
            already_connected: connected.some((c) => c.provider_id === repo.provider_id),
          })),
        }
      }
      if (path.startsWith('/repositories')) return { items: connected }
      throw new ApiError(404, path)
    },
    post: async (path, body) => {
      const { providerId } = body as ConnectRepositoryRequest
      const repo = pool.find((r) => r.provider_id === providerId)
      if (path !== '/repositories' || !repo) throw new ApiError(404, path)
      register(repo)
      return connected[connected.length - 1]
    },
  })
  return transport
}

let backend: ApiTransport

beforeEach(() => {
  backend = createBackend()
})

function renderConnectPage(transport: ApiTransport = backend) {
  renderWithTransport(
    <MemoryRouter initialEntries={['/repositories/connect']}>
      <Routes>
        <Route path="/repositories/connect" element={<ConnectRepositoryPage />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
      </Routes>
    </MemoryRouter>,
    transport,
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

  it('подключённый репозиторий отмечен, а не предлагается снова', async () => {
    renderConnectPage()

    const row = (await screen.findByText('larchanka-training/docs')).closest('tr')
    expect(within(row as HTMLElement).getByText('Подключён')).toBeInTheDocument()
    expect(within(row as HTMLElement).queryByRole('button')).not.toBeInTheDocument()
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

  it('501 от бэкенда — понятное сообщение, что подключение ещё недоступно', async () => {
    const notImplemented = () =>
      Promise.reject(new ApiError(501, 'Не реализовано', 'NOT_IMPLEMENTED'))
    renderConnectPage(fakeTransport({ get: notImplemented, post: notImplemented }))

    expect(await screen.findByText(/Подключение репозиториев пока недоступно/)).toBeInTheDocument()
  })
})
