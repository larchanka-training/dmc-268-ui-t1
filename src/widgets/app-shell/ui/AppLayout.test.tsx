import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth'
import { ThemeProvider } from '@/features/theme'
import { ME, renderWithQuery, stubFetch } from '@/test/api'
import { AppLayout } from '@/widgets/app-shell/ui/AppLayout'

function renderLayout() {
  return renderWithQuery(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <RequireAuth>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<p>обзор</p>} />
              <Route path="/analytics" element={<p>аналитика</p>} />
            </Route>
          </Routes>
        </RequireAuth>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('Кабинет на узком экране', () => {
  beforeEach(() => {
    const matchMedia = window.matchMedia
    // Телефон: ни один `min-width` брейкпоинт antd не выполняется.
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...matchMedia(query),
      matches: false,
    }))
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('навигация в выдвижном меню, переход закрывает его', async () => {
    renderLayout()

    await screen.findByText('обзор')
    expect(screen.queryByRole('menuitem', { name: /Аналитика/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Открыть меню' }))
    expect(await screen.findByRole('dialog', { name: 'Меню' })).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('menuitem', { name: /Аналитика/ }))

    expect(await screen.findByText('аналитика')).toBeInTheDocument()
    // Анимации в jsdom нет: закрытие видно по классу открытого Drawer.
    await waitFor(() => expect(document.querySelector('.ant-drawer-open')).toBeNull())
  })
})
