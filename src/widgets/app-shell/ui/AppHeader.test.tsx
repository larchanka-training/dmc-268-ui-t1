import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { RequireAuth } from '@/features/auth'
import { ThemeProvider } from '@/features/theme'
import { navigation } from '@/shared/lib'
import { ME, renderWithQuery, stubFetch } from '@/test/api'
import { AppHeader } from '@/widgets/app-shell/ui/AppHeader'

function renderAppHeader() {
  return renderWithQuery(
    <ThemeProvider>
      <RequireAuth>
        <AppHeader />
      </RequireAuth>
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

    fireEvent.click(await screen.findByRole('button', { name: 'Переключить тему' }))

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

    expect(document.querySelector('.ant-avatar img')).toHaveAttribute('src', ME.avatar_url)
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

  it.each([401, 403])('выход с ответом %i — одна навигация, на /', async (status) => {
    stubFetch({
      'GET /api/v1/auth/me': { status: 200, body: ME },
      'POST /api/v1/auth/logout': { status },
    })

    await signOut()

    await waitFor(() => expect(navigation.assign).toHaveBeenCalledWith('/'))
    expect(navigation.assign).toHaveBeenCalledTimes(1)
  })
})

describe('Профиль без имени и аватара', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['name: null, avatar_url: null', { name: null, avatar_url: null }],
    ['name: пустая строка, avatar_url: пустая строка', { name: '', avatar_url: '' }],
  ])('%s — в шапке логин и буква логина в аватаре', async (_, patch) => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: { ...ME, ...patch } } })

    renderAppHeader()

    expect(await screen.findByText('octocat')).toBeInTheDocument()
    expect(screen.getByText('O')).toBeInTheDocument()
  })
})
