import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { App } from '@/app/App'
import { ThemeProvider } from '@/features/theme'
import { HelpPage } from '@/pages/HelpPage'
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

describe('«В кабинет» на помощи', () => {
  function Path() {
    return <output>{useLocation().pathname}</output>
  }
  function renderAt(initialEntries: string[]) {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/help" element={<HelpPage />} />
            <Route path="*" element={<Link to="/help">Помощь</Link>} />
          </Routes>
          <Path />
        </MemoryRouter>
      </ThemeProvider>,
    )
  }

  it('один landmark main: Layout.Content antd, внутри него div', () => {
    renderAt(['/help'])
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('пришли из кабинета — возвращает туда же', async () => {
    renderAt(['/repositories'])
    await userEvent.click(screen.getByRole('link', { name: 'Помощь' }))
    await userEvent.click(screen.getByRole('link', { name: 'В кабинет' }))
    expect(screen.getByRole('status')).toHaveTextContent('/repositories')
  })

  it('открыли помощь напрямую — ведёт на «Обзор»', async () => {
    renderAt(['/help'])
    await userEvent.click(screen.getByRole('link', { name: 'В кабинет' }))
    expect(screen.getByRole('status')).toHaveTextContent(/^\/$/)
  })
})

describe('ссылки на помощь', () => {
  it('на странице входа есть «Как это работает?» на помощь', () => {
    const html = new DOMParser().parseFromString(loginHtml, 'text/html')
    const link = [...html.querySelectorAll('a')].find((a) => a.textContent === 'Как это работает?')
    expect(link?.getAttribute('href')).toBe('/app/help')
  })
})
