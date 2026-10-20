import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Repository } from '@/entities/repository'
import { RepositoriesPage } from '@/pages/RepositoriesPage'
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
    <MemoryRouter>
      <RepositoriesPage />
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
})
