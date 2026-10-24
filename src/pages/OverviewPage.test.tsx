import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { RequireAuth } from '@/features/auth'
import { OverviewPage } from '@/pages/OverviewPage'
import { ApiError } from '@/shared/api'
import { fakeTransport, ME, renderWithTransport, stubFetch } from '@/test/api'

/** Профиль — из `fetch` (`RequireAuth`), список репозиториев — через `ApiTransport`. */
const noRepositories = fakeTransport({ get: async () => ({ items: [] }) })

describe('OverviewPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['name: null', { name: null, avatar_url: null }],
    ['name: пустая строка', { name: '', avatar_url: null }],
  ])('%s — приветствие с логином', async (_, patch) => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: { ...ME, ...patch } } })

    renderWithTransport(
      <MemoryRouter>
        <RequireAuth>
          <OverviewPage />
        </RequireAuth>
      </MemoryRouter>,
      noRepositories,
    )

    expect(await screen.findByText('С возвращением, octocat')).toBeInTheDocument()
  })

  it('с именем приветствует по имени', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    renderWithTransport(
      <MemoryRouter>
        <RequireAuth>
          <OverviewPage />
        </RequireAuth>
      </MemoryRouter>,
      noRepositories,
    )

    expect(await screen.findByText('С возвращением, The Octocat')).toBeInTheDocument()
  })

  it('репозитории не загрузились (502) — не «0», а ошибка с повтором', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    let githubDown = true
    renderWithTransport(
      <MemoryRouter>
        <RequireAuth>
          <OverviewPage />
        </RequireAuth>
      </MemoryRouter>,
      fakeTransport({
        get: async () => {
          if (githubDown) throw new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
          return { items: [] }
        },
      }),
    )

    const problem = await screen.findByRole('alert')
    expect(problem).toHaveTextContent('Не удалось загрузить репозитории')
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    githubDown = false
    await userEvent.click(within(problem).getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('0')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
