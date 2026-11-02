import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { focusManager } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

import { App } from '@/app/App'
import { ThemeProvider } from '@/features/theme'
import { ApiError, type ApiTransport } from '@/shared/api'
import type { ApiSchemas } from '@/shared/api/contract'
import { fakeTransport, renderWithTransport, stubFetch } from '@/test/api'
import loginHtml from '../../../../login.html?raw'

import { StatusPage } from './StatusPage'

type Report = ApiSchemas['ServiceStatusResponse']
type Status = Report['status']

function report(
  status: Status,
  components: [Status, Status, Status] = [status, status, status],
  checked_at = '2026-11-02T10:00:00Z',
): Report {
  const [api, worker, queue] = components
  return {
    status,
    components: [
      { id: 'api', status: api },
      { id: 'worker', status: worker },
      { id: 'queue', status: queue },
    ],
    checked_at,
  }
}

function renderStatusPage(get: ApiTransport['get']) {
  return renderWithTransport(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/status']}>
        <StatusPage />
      </MemoryRouter>
    </ThemeProvider>,
    fakeTransport({ get }),
  )
}

/** Строка компонента по его названию: «API», «Обработка ревью», «Очередь задач». */
function componentRow(name: string) {
  const row = screen
    .getAllByRole('listitem')
    .find((item) => within(item).queryByText(name, { exact: true }))
  if (!row) throw new Error(`нет строки компонента ${name}`)
  return row
}

describe('StatusPage', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('пока статус не пришёл, показывает загрузку', () => {
    renderStatusPage(() => new Promise(() => {}))

    expect(screen.getByRole('status')).toHaveTextContent('Проверяем состояние сервиса…')
  })

  it.each([
    ['operational', 'Работает'],
    ['degraded', 'Работает со сбоями'],
    ['outage', 'Недоступен'],
    ['unknown', 'Нет данных'],
  ] as const)('состояние %s показывает словом «%s»', async (status, label) => {
    renderStatusPage(async () => report(status))

    expect(await screen.findByText(`Общее состояние: ${label}`)).toBeInTheDocument()
    for (const name of ['API', 'Обработка ревью', 'Очередь задач']) {
      expect(within(componentRow(name)).getByText(label)).toBeInTheDocument()
    }
  })

  it('показывает каждому компоненту своё состояние и время проверки', async () => {
    renderStatusPage(async () =>
      report('outage', ['operational', 'outage', 'degraded'], '2026-11-02T09:15:00Z'),
    )

    expect(await screen.findByText('Общее состояние: Недоступен')).toBeInTheDocument()
    expect(within(componentRow('API')).getByText('Работает')).toBeInTheDocument()
    expect(within(componentRow('Обработка ревью')).getByText('Недоступен')).toBeInTheDocument()
    expect(
      within(componentRow('Очередь задач')).getByText('Работает со сбоями'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Проверено: 02\.11\.2026, 09:15 UTC/)).toBeInTheDocument()
  })

  it.each([
    ['сбой сети', new TypeError('Failed to fetch')],
    ['502 от nginx', new ApiError(502, 'Запрос /status завершился ошибкой 502')],
  ])('%s: API недоступен, про воркер и очередь — нет данных', async (_name, error) => {
    renderStatusPage(() => Promise.reject(error))

    expect(await screen.findByText('Не удалось получить статус от API')).toBeInTheDocument()
    expect(screen.getByText('Общее состояние: Недоступен')).toBeInTheDocument()
    expect(within(componentRow('API')).getByText('Недоступен')).toBeInTheDocument()
    expect(within(componentRow('Обработка ревью')).getByText('Нет данных')).toBeInTheDocument()
    expect(within(componentRow('Очередь задач')).getByText('Нет данных')).toBeInTheDocument()
    expect(screen.getByText(/Проверено: /)).toBeInTheDocument()
  })

  it('«Проверить снова» после сбоя показывает пришедший статус', async () => {
    const get = vi
      .fn<ApiTransport['get']>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(report('operational'))
    renderStatusPage(get)

    await userEvent.click(await screen.findByRole('button', { name: 'Проверить снова' }))

    expect(await screen.findByText('Общее состояние: Работает')).toBeInTheDocument()
    expect(screen.queryByText('Не удалось получить статус от API')).not.toBeInTheDocument()
  })

  it('опрашивает статус раз в 30 секунд и показывает свежий ответ', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const get = vi
      .fn<ApiTransport['get']>()
      .mockResolvedValueOnce(report('operational'))
      .mockResolvedValue(report('degraded', ['operational', 'degraded', 'operational']))
    renderStatusPage(get)
    expect(await screen.findByText('Общее состояние: Работает')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(29_000))
    expect(get).toHaveBeenCalledTimes(1)

    await act(() => vi.advanceTimersByTimeAsync(1_000))
    expect(get).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('Общее состояние: Работает со сбоями')).toBeInTheDocument()
  })

  it('перезапрашивает статус при возврате на вкладку', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const get = vi.fn<ApiTransport['get']>().mockResolvedValue(report('operational'))
    renderStatusPage(get)
    expect(await screen.findByText('Общее состояние: Работает')).toBeInTheDocument()

    // Сервер кэширует оценку на 15 с: раньше возврат на вкладку статус не перезапрашивает.
    await act(() => vi.advanceTimersByTimeAsync(16_000))
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    act(() => focusManager.setFocused(undefined))
  })

  it('сбой опроса после удачного ответа не оставляет на экране старое состояние', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const get = vi
      .fn<ApiTransport['get']>()
      .mockResolvedValueOnce(report('operational'))
      .mockRejectedValue(new ApiError(502, 'Запрос /status завершился ошибкой 502'))
    renderStatusPage(get)
    expect(await screen.findByText('Общее состояние: Работает')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(30_000))

    expect(await screen.findByText('Общее состояние: Недоступен')).toBeInTheDocument()
    expect(within(componentRow('Обработка ревью')).getByText('Нет данных')).toBeInTheDocument()
  })
})

describe('статус сервиса для гостя', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('открывается без сессии: запрашивается только /status, профиль — нет', async () => {
    // Запрос профиля (`/auth/me`) идёт мимо транспорта, через `fetch`: любой уронил бы тест.
    const calls = stubFetch({})
    const get = vi.fn<ApiTransport['get']>().mockResolvedValue(report('operational'))
    window.history.pushState({}, '', '/app/status')
    render(<App transport={fakeTransport({ get })} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Статус сервиса' })).toBeVisible()
    expect(await screen.findByText('Общее состояние: Работает')).toBeInTheDocument()
    expect(get.mock.calls.map(([path]) => path)).toEqual(['/status'])
    expect(calls).toHaveLength(0)
  })

  it('на странице входа есть ссылка «Статус сервиса»', () => {
    const html = new DOMParser().parseFromString(loginHtml, 'text/html')
    const link = [...html.querySelectorAll('a')].find((a) => a.textContent === 'Статус сервиса')
    expect(link?.getAttribute('href')).toBe('/app/status')
  })
})
