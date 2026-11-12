import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { RequireAuth } from '@/features/auth'
import { ThemeProvider } from '@/features/theme'
import { ME, renderWithQuery, stubFetch } from '@/test/api'
import { AppHeader } from '@/widgets/app-shell/ui/AppHeader'

const LINK = 'https://buy.stripe.com/test_dRm9AS855dXR4sZbulc3m00'
const env = vi.hoisted(() => ({ link: undefined as string | undefined }))
vi.mock('@/shared/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/config/env')>()),
  get STRIPE_PAYMENT_LINK() {
    return env.link
  },
}))

function renderAppHeader() {
  return renderWithQuery(
    <ThemeProvider>
      <RequireAuth>
        <AppHeader />
      </RequireAuth>
    </ThemeProvider>,
  )
}

describe('Шапка: «Пополнить баланс»', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('ведёт на Payment Link с id пользователя', async () => {
    env.link = LINK
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    renderAppHeader()

    const link = await screen.findByRole('link', { name: 'Пополнить баланс' })
    expect(link).toHaveAttribute('href', `${LINK}?client_reference_id=${ME.id}`)
  })

  it('уже lg только иконка, имя для скринридера то же', async () => {
    env.link = LINK
    const matchMedia = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...matchMedia(query),
      // Ширина между md и lg: брейкпоинты от lg (992) и выше не выполняются.
      matches: query.includes('min-width') && !/(992|1200|1600)px/.test(query),
    }))
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    renderAppHeader()

    const link = await screen.findByRole('link', { name: 'Пополнить баланс' })
    expect(link).not.toHaveTextContent('Пополнить баланс')
  })

  it('без переменной кнопки нет', async () => {
    env.link = undefined
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    renderAppHeader()

    await screen.findByRole('button', { name: 'Переключить тему' })
    expect(screen.queryByRole('link', { name: 'Пополнить баланс' })).not.toBeInTheDocument()
  })
})
