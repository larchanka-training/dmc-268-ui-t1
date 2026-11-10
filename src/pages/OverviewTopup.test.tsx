import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'

import { RequireAuth } from '@/features/auth'
import { OverviewPage } from '@/pages/OverviewPage'
import { fakeTransport, ME, renderWithTransport, stubFetch } from '@/test/api'

const LINK = 'https://buy.stripe.com/test_dRm9AS855dXR4sZbulc3m00'
const env = vi.hoisted(() => ({ link: undefined as string | undefined }))
vi.mock('@/shared/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/config/env')>()),
  get STRIPE_PAYMENT_LINK() {
    return env.link
  },
}))

function Location() {
  const { pathname, search } = useLocation()
  return <output data-testid="location">{pathname + search}</output>
}

function renderOverview(url: string) {
  return renderWithTransport(
    <MemoryRouter initialEntries={[url]}>
      <RequireAuth>
        <OverviewPage />
      </RequireAuth>
      <Location />
    </MemoryRouter>,
    fakeTransport({ get: async () => ({ items: [], install_url: null }) }),
  )
}

describe('Overview: пополнение через Stripe', () => {
  beforeEach(() => {
    env.link = LINK
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('ссылка ведёт на Payment Link с id пользователя; спецсимволы не ломают query', async () => {
    const id = 'u 1&x=2'
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: { ...ME, id } } })
    renderOverview('/')

    const link = await screen.findByRole('link', { name: 'Пополнить' })
    expect(link).toHaveAttribute('href', `${LINK}?client_reference_id=u+1%26x%3D2`)
    expect(link).not.toHaveAttribute('target')
  })

  it('кривая переменная не роняет «Обзор»: ссылки нет, пополняет администратор', async () => {
    env.link = 'не адрес'
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    renderOverview('/')

    expect(await screen.findByText('Пополняет администратор сервиса')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Пополнить' })).not.toBeInTheDocument()
  })

  it('свой query ссылки сохраняется рядом с client_reference_id', async () => {
    env.link = `${LINK}?locale=ru`
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    renderOverview('/')

    const link = await screen.findByRole('link', { name: 'Пополнить' })
    expect(link).toHaveAttribute('href', `${LINK}?locale=ru&client_reference_id=${ME.id}`)
  })

  it('без переменной ссылки нет', async () => {
    env.link = undefined
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    renderOverview('/')

    expect(await screen.findByText('Баланс')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Пополнить' })).not.toBeInTheDocument()
  })

  it('без возврата из Stripe уведомления нет', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    renderOverview('/')

    await screen.findByText('Баланс')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('возврат: уведомление, чистый адрес с чужими параметрами, опрос минуту и стоп', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = vi.fn(async () => Response.json(ME))
    vi.stubGlobal('fetch', fetchMock)
    renderOverview('/?topup=success&session_id=cs_test_1&tab=x')

    expect(await screen.findByText(/Оплата принята, баланс обновится/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/\?tab=x$/))

    const before = fetchMock.mock.calls.length
    await act(() => vi.advanceTimersByTimeAsync(6_500))
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(before + 2)

    await act(() => vi.advanceTimersByTimeAsync(55_000))
    const after = fetchMock.mock.calls.length
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(fetchMock.mock.calls.length).toBe(after)
  })

  it('уведомление закрывается', async () => {
    const user = userEvent.setup()
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    renderOverview('/?topup=success&session_id=cs_test_1')

    expect(await screen.findByText(/Оплата принята/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /close/i }))
    await waitFor(() => expect(screen.queryByText(/Оплата принята/)).not.toBeInTheDocument())
  })
})
