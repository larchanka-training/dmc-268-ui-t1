import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Repository } from '@/entities/repository'
import { RepositoriesPage } from '@/pages/RepositoriesPage'
import { RepositorySettingsPage } from '@/pages/RepositorySettingsPage'
import { fakeTransport, renderWithTransport } from '@/test/api'

function repository(n: number, full_name: string, auto_review_enabled: boolean): Repository {
  return {
    id: `repo-${n}`,
    provider: 'github',
    provider_id: String(100 + n),
    full_name,
    default_branch: 'main',
    auto_review_enabled,
    created_at: '2026-09-28T08:30:00Z',
    updated_at: '2026-09-28T08:30:00Z',
  }
}

function renderRepositoriesPage(get = fakeTransport().get) {
  return renderWithTransport(
    <MemoryRouter initialEntries={['/repositories']}>
      <Routes>
        <Route path="/repositories" element={<RepositoriesPage />} />
        <Route path="/repositories/:repositoryId/settings" element={<RepositorySettingsPage />} />
      </Routes>
    </MemoryRouter>,
    fakeTransport({ get }),
  )
}

describe('RepositoriesPage', () => {
  it('показывает состояние загрузки, пока список грузится', () => {
    const { container } = renderRepositoriesPage(() => new Promise(() => {}))

    expect(container.querySelector('.ant-spin-spinning')).toBeInTheDocument()
  })

  it('отображает подключённые репозитории из GET /repositories', async () => {
    const paths: string[] = []
    renderRepositoriesPage(async (path) => {
      paths.push(path)
      return {
        items: [
          repository(1, 'larchanka-training/platform-api', true),
          repository(2, 'larchanka-training/docs', false),
        ],
      }
    })

    expect(await screen.findByText('larchanka-training/platform-api')).toBeInTheDocument()
    expect(screen.getByText('larchanka-training/docs')).toBeInTheDocument()
    expect(screen.getByText('Включено')).toBeInTheDocument()
    expect(screen.getByText('Выключено')).toBeInTheDocument()
    // Время — общим форматтером `shared/lib`, как на экране прогона.
    expect(screen.getAllByText('28.09.2026, 08:30 UTC')).toHaveLength(2)
    expect(paths).toEqual(['/repositories?limit=200'])
  })

  it('ответ не по контракту — ошибка, а не пустая таблица', async () => {
    renderRepositoriesPage(async () => [repository(1, 'larchanka-training/docs', true)])

    expect(await screen.findByText('Не удалось загрузить репозитории')).toBeInTheDocument()
  })

  it('из списка открывает экран настроек репозитория', async () => {
    const user = userEvent.setup()
    renderRepositoriesPage(async (path) => {
      if (path === '/repositories?limit=200') {
        return { items: [repository(1, 'larchanka-training/platform-api', true)] }
      }
      if (path === '/repositories/repo-1/settings') {
        return { autoReviewEnabled: true, branchFilter: ['feature/**'], minSeverity: 'high' }
      }
      if (path === '/repositories/repo-1/rules') {
        return {
          status: 'loaded',
          branch: 'main',
          path: '.review/rules.md',
          rules: [],
          rejected: [],
          fetchedAt: '2026-10-11T09:40:00.000Z',
        }
      }
      if (path === '/repositories/repo-1/history') return []
      throw new Error(`неожиданный запрос ${path}`)
    })

    const [settingsLink] = await screen.findAllByRole('link', { name: 'Настройки' })
    await user.click(settingsLink)

    expect(await screen.findByText('Настройки репозитория')).toBeInTheDocument()
    expect(screen.getByText('larchanka-training/platform-api')).toBeInTheDocument()
  })
})
