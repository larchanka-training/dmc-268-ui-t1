import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/features/auth'
import { ThemeProvider } from '@/features/theme'
import { AppHeader } from '@/widgets/app-shell/ui/AppHeader'

function renderAppHeader() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <AppHeader />
      </AuthProvider>
    </ThemeProvider>,
  )
}

describe('Переключение темы', () => {
  beforeEach(() => {
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
