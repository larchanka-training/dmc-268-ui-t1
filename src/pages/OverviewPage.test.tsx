import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { RequireAuth } from '@/features/auth'
import { OverviewPage } from '@/pages/OverviewPage'
import { ME, renderWithQuery, stubFetch } from '@/test/api'

describe('OverviewPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['name: null', { name: null, avatar_url: null }],
    ['name: пустая строка', { name: '', avatar_url: null }],
  ])('%s — приветствие с логином', async (_, patch) => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: { ...ME, ...patch } } })

    renderWithQuery(
      <MemoryRouter>
        <RequireAuth>
          <OverviewPage />
        </RequireAuth>
      </MemoryRouter>,
    )

    expect(await screen.findByText('С возвращением, octocat')).toBeInTheDocument()
  })

  it('с именем приветствует по имени', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    renderWithQuery(
      <MemoryRouter>
        <RequireAuth>
          <OverviewPage />
        </RequireAuth>
      </MemoryRouter>,
    )

    expect(await screen.findByText('С возвращением, The Octocat')).toBeInTheDocument()
  })
})
