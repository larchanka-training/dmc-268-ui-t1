import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'

function AuthProbe() {
  const { isAuthenticated, user } = useAuth()
  return <div>{isAuthenticated ? `authenticated:${user?.login}` : 'anonymous'}</div>
}

describe('OAuthCallbackPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('happy-path: валидный state → сессия → редирект на /repositories', async () => {
    sessionStorage.setItem('dmc268.oauth.state', 'state-123')
    sessionStorage.setItem('dmc268.oauth.provider', 'github')

    render(
      <MemoryRouter initialEntries={['/oauth/callback?code=mock_github_auth_code&state=state-123']}>
        <AuthProvider>
          <Routes>
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/repositories" element={<AuthProbe />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('authenticated:dev-user')).toBeInTheDocument()

    const persisted: unknown = JSON.parse(localStorage.getItem('dmc268.auth.user') ?? 'null')
    expect(persisted).toMatchObject({ login: 'dev-user', provider: 'github' })
    expect(sessionStorage.getItem('dmc268.oauth.state')).toBeNull()
    expect(sessionStorage.getItem('dmc268.oauth.provider')).toBeNull()
  })
})
