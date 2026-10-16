import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@/features/theme'
import { navigation } from '@/shared/lib'
import { ME, renderWithQuery, stubFetch } from '@/test/api'
import { AppHeader } from '@/widgets/app-shell/ui/AppHeader'

function renderAppHeader() {
  return renderWithQuery(
    <ThemeProvider>
      <AppHeader />
    </ThemeProvider>,
  )
}

describe('Переключение темы', () => {
  afterEach(() => vi.unstubAllGlobals())
  beforeEach(() => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('переключает тему в шапке и сохраняет выбор', async () => {
    renderAppHeader()

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Переключить тему' }))

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark')
      expect(localStorage.getItem('dmc268.theme')).toBe('dark')
    })
  })

  it('после перезагрузки стартует в сохранённой теме', async () => {
    localStorage.setItem('dmc268.theme', 'dark')

    renderAppHeader()

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark')
    })
  })
})

describe('Профиль и выход', () => {
  beforeEach(() => {
    vi.spyOn(navigation, 'assign').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  async function signOut() {
    renderAppHeader()
    fireEvent.click(await screen.findByText('octocat'))
    fireEvent.click(await screen.findByText('Выйти'))
  }

  it('показывает логин из /auth/me и выходит через POST /auth/logout', async () => {
    const calls = stubFetch({
      'GET /api/v1/auth/me': { status: 200, body: ME },
      'POST /api/v1/auth/logout': { status: 204 },
    })

    await signOut()

    await waitFor(() => expect(navigation.assign).toHaveBeenCalledWith('/'))
    expect(calls.map((c) => `${c.init.method ?? 'GET'} ${c.url}`)).toContain(
      'POST /api/v1/auth/logout',
    )
  })

  it('уходит на / и тогда, когда выход не удался', async () => {
    stubFetch({
      'GET /api/v1/auth/me': { status: 200, body: ME },
      'POST /api/v1/auth/logout': new TypeError('Failed to fetch'),
    })

    await signOut()

    await waitFor(() => expect(navigation.assign).toHaveBeenCalledWith('/'))
  })
})
