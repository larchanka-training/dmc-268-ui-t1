import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/model/AuthProvider'
import { RequireAuth } from '@/features/auth/ui/RequireAuth'

describe('RequireAuth', () => {
  it('перенаправляет неавторизованного пользователя на /login', async () => {
    render(
      <MemoryRouter initialEntries={['/private']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>login page</div>} />
            <Route
              path="/private"
              element={
                <RequireAuth>
                  <div>private</div>
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('login page')).toBeInTheDocument()
  })
})
