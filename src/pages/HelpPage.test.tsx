import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { App } from '@/app/App'
import { ThemeProvider } from '@/features/theme'
import { HelpPage } from '@/pages/HelpPage'
import { AppSidebar } from '@/widgets/app-shell/ui/AppSidebar'
import { stubFetch } from '@/test/api'
import loginHtml from '../../login.html?raw'

const ANCHORS = [
  'start',
  'repo-missing',
  'toggle-disabled',
  'bot-silent',
  'rerun',
  'pause-review',
  'remove-access',
  'rules',
  'merge-gate',
  'who-sees',
]

describe('HelpPage', () => {
  const scrollIntoView = vi.fn()
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    scrollIntoView.mockClear()
  })

  it('открывается без сессии: ни одного запроса, оба раздела и все якоря на месте', async () => {
    // Любой запрос уронил бы тест: `/auth/me` вернул бы 401 и увёл бы на вход.
    const calls = stubFetch({})
    window.history.pushState({}, '', '/app/help')
    render(<App />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Как начать' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Вопросы и ответы' })).toBeInTheDocument()
    for (const id of ANCHORS) expect(document.getElementById(id), id).not.toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('показывает пример .review/rules.md моноширинным блоком', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/help']}>
          <HelpPage />
        </MemoryRouter>
      </ThemeProvider>,
    )
    const code = screen.getByText(/## Обработка ошибок/)
    expect(code.tagName).toBe('CODE')
    expect(code.closest('pre')).not.toBeNull()
  })

  it('прокручивает к вопросу из якоря в адресе', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/help#toggle-disabled']}>
          <HelpPage />
        </MemoryRouter>
      </ThemeProvider>,
    )
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('toggle-disabled'))
  })
})

describe('ссылки на помощь', () => {
  it('пункт «Помощь» в боковом меню ведёт на /help', async () => {
    function Path() {
      return <output>{useLocation().pathname}</output>
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppSidebar />
        <Path />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('menuitem', { name: /Помощь/ }))
    expect(screen.getByRole('status')).toHaveTextContent('/help')
  })

  it('на странице входа есть «Как это работает?» на помощь', () => {
    const html = new DOMParser().parseFromString(loginHtml, 'text/html')
    const link = [...html.querySelectorAll('a')].find((a) => a.textContent === 'Как это работает?')
    expect(link?.getAttribute('href')).toBe('/app/help')
  })
})
