import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Analytics } from '@/entities/analytics'
import { ApiError } from '@/shared/api'
import type { ApiTransport } from '@/shared/api'
import { navigation } from '@/shared/lib'
import { fakeTransport, renderWithTransport } from '@/test/api'

import { AnalyticsPage } from './AnalyticsPage'

// canvas в jsdom нет: диаграмма подменена, в тесте видны только её данные.
const chart = vi.hoisted(() => ({ fail: false, theme: '' }))
vi.mock('@ant-design/charts', () => ({
  Column: ({ data, theme }: { data: { count: number }[]; theme: string }) => {
    if (chart.fail) throw new Error('G2 упал')
    chart.theme = theme
    return <div data-testid="chart" data-points={data.length} data-total={sum(data)} />
  },
}))
const theme = vi.hoisted(() => ({ mode: 'light' }))
vi.mock('@/features/theme', () => ({ useAppTheme: () => ({ mode: theme.mode }) }))

function sum(data: { count: number }[]) {
  return data.reduce((total, point) => total + point.count, 0)
}

const REPO_ID = '00000000-0000-4000-8000-000000000001'

const ANALYTICS: Analytics = {
  created_from: '2026-11-08T10:00:00Z',
  created_to: '2026-11-11T10:00:00Z',
  findings_by_day: [
    { date: '2026-11-09', category: 'security', severity: 'high', count: 2 },
    { date: '2026-11-10', category: 'readability', severity: 'low', count: 5 },
  ],
  runs: { count: 7, average_duration_seconds: 134, p95_duration_seconds: 300 },
  by_repository: [
    {
      repository_id: REPO_ID,
      full_name: 'acme/api',
      runs_count: 7,
      average_duration_seconds: 134,
      p95_duration_seconds: 300,
      findings_count: 7,
    },
  ],
}

const REPOSITORIES = {
  items: [
    {
      provider: 'github',
      provider_id: '1',
      full_name: 'acme/api',
      default_branch: 'main',
      connected: true,
      id: REPO_ID,
      can_connect: true,
      connected_at: '2026-10-01T10:00:00Z',
      payer_login: null,
    },
    {
      provider: 'github',
      provider_id: '2',
      full_name: 'acme/disabled',
      default_branch: 'main',
      connected: false,
      id: '00000000-0000-4000-8000-000000000002',
      can_connect: true,
      connected_at: null,
      payer_login: null,
    },
    {
      provider: 'github',
      provider_id: '3',
      full_name: 'acme/never-seen',
      default_branch: 'main',
      connected: false,
      id: null,
      can_connect: true,
      connected_at: null,
      payer_login: null,
    },
  ],
  install_url: null,
}

function render(analytics: (path: string) => Promise<unknown>) {
  const get = vi.fn((path: string) =>
    path.startsWith('/analytics') ? analytics(path) : Promise.resolve(REPOSITORIES),
  ) as unknown as ApiTransport['get']
  renderWithTransport(<AnalyticsPage />, fakeTransport({ get }))
  return get as unknown as ReturnType<typeof vi.fn>
}

const analyticsCalls = (get: ReturnType<typeof vi.fn>) =>
  get.mock.calls
    .map(([path]) => new URL(path as string, 'http://x'))
    .filter((u) => u.pathname === '/analytics')

describe('AnalyticsPage', () => {
  afterEach(() => {
    chart.fail = false
    theme.mode = 'light'
    vi.restoreAllMocks()
  })

  it('показывает итоги, диаграмму и таблицу по репозиториям; по умолчанию 30 дней и обе границы', async () => {
    const get = render(async () => ANALYTICS)

    expect(await screen.findByTestId('chart')).toHaveAttribute('data-total', '7')
    // 4 UTC-дня периода (крайние неполные) × 4 категории: пустые дни достроены нулями.
    expect(screen.getByTestId('chart')).toHaveAttribute('data-points', '16')
    // Средняя длительность: карточка итогов и строка таблицы.
    expect(screen.getAllByText('2 мин 14 с')).toHaveLength(2)
    expect(screen.getAllByText('5 мин')).toHaveLength(2)
    expect(screen.getByRole('cell', { name: 'acme/api' })).toBeInTheDocument()

    const [call] = analyticsCalls(get)
    const from = Date.parse(call.searchParams.get('created_from')!)
    const to = Date.parse(call.searchParams.get('created_to')!)
    expect(to - from).toBe(30 * 86_400_000)
    expect(call.searchParams.has('repository_id')).toBe(false)
  })

  it('период 180 дней уходит с обеими границами ровно в 180 суток', async () => {
    const user = userEvent.setup()
    const get = render(async () => ANALYTICS)
    await screen.findByTestId('chart')

    await user.click(screen.getByText('180 дн.'))

    await waitFor(() => expect(analyticsCalls(get)).toHaveLength(2))
    const call = analyticsCalls(get)[1]
    expect(
      Date.parse(call.searchParams.get('created_to')!) -
        Date.parse(call.searchParams.get('created_from')!),
    ).toBe(180 * 86_400_000)
  })

  it('выбор репозитория добавляет repository_id', async () => {
    const user = userEvent.setup()
    const get = render(async () => ANALYTICS)
    await screen.findByTestId('chart')

    await user.click(screen.getByRole('combobox', { name: 'Репозиторий' }))
    await user.click(await screen.findByTitle('acme/api'))

    await waitFor(() => expect(analyticsCalls(get)).toHaveLength(2))
    expect(analyticsCalls(get)[1].searchParams.get('repository_id')).toBe(REPO_ID)
  })

  it('фильтр важности пересчитывает диаграмму без нового запроса', async () => {
    const user = userEvent.setup()
    const get = render(async () => ANALYTICS)
    await screen.findByTestId('chart')

    await user.click(screen.getByRole('combobox', { name: 'Важность' }))
    await user.click(await screen.findByTitle('High'))

    await waitFor(() => expect(screen.getByTestId('chart')).toHaveAttribute('data-total', '2'))
    expect(analyticsCalls(get)).toHaveLength(1)
  })

  it('замечаний выбранной важности нет — строка об этой важности', async () => {
    const user = userEvent.setup()
    render(async () => ANALYTICS)
    await screen.findByTestId('chart')

    await user.click(screen.getByRole('combobox', { name: 'Важность' }))
    await user.click(await screen.findByTitle('Critical'))

    expect(await screen.findByText('Замечаний этой важности за период нет')).toBeInTheDocument()
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
  })

  it('нет прогонов — пустое состояние без диаграммы', async () => {
    render(async () => ({
      ...ANALYTICS,
      findings_by_day: [],
      runs: { count: 0, average_duration_seconds: null, p95_duration_seconds: null },
      by_repository: [],
    }))

    expect(
      await screen.findByText('За выбранный период нет завершённых ревью.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
  })

  it('ошибка бэкенда — сообщение с повтором', async () => {
    const user = userEvent.setup()
    let fail = true
    render(async () => {
      if (fail) throw new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
      return ANALYTICS
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Не удалось загрузить аналитику')
    expect(alert).toHaveTextContent('GitHub недоступен')
    fail = false
    await user.click(within(alert).getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByTestId('chart')).toBeInTheDocument()
  })

  it('обновление показанных данных упало — данные на месте, сверху плашка с повтором', async () => {
    const user = userEvent.setup()
    let calls = 0
    render(async () => {
      calls += 1
      if (calls === 3) throw new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
      return ANALYTICS
    })
    await screen.findByTestId('chart')

    // Все → acme/api → снова все: ответ «всех» уже в кэше, его перезапрос падает.
    await user.click(screen.getByRole('combobox', { name: 'Репозиторий' }))
    await user.click(await screen.findByTitle('acme/api'))
    await waitFor(() => expect(calls).toBe(2))
    await user.click(screen.getByRole('combobox', { name: 'Репозиторий' }))
    await user.click(await screen.findByTitle('Все репозитории'))

    expect(await screen.findByText('Не удалось обновить аналитику')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'acme/api' })).toBeInTheDocument()
    expect(screen.queryByText('Не удалось загрузить аналитику')).not.toBeInTheDocument()
  })

  it('в фильтре есть выключенные репозитории с историей, но нет без id', async () => {
    const user = userEvent.setup()
    render(async () => ANALYTICS)
    await screen.findByTestId('chart')

    await user.click(screen.getByRole('combobox', { name: 'Репозиторий' }))

    expect(await screen.findByTitle('acme/disabled')).toBeInTheDocument()
    expect(screen.queryByTitle('acme/never-seen')).not.toBeInTheDocument()
  })

  it('текстовая сводка по категориям для скринридера', async () => {
    render(async () => ANALYTICS)

    expect(await screen.findByText(/Безопасность — 2; .*Читаемость — 5/)).toBeInTheDocument()
  })

  it('диаграмма получает тему приложения', async () => {
    theme.mode = 'dark'
    render(async () => ANALYTICS)
    await screen.findByTestId('chart')

    expect(chart.theme).toBe('classicDark')
  })

  it('прогоны есть, замечаний нет — строка вместо пустой диаграммы', async () => {
    render(async () => ({ ...ANALYTICS, findings_by_day: [] }))

    expect(await screen.findByText('За период замечаний нет')).toBeInTheDocument()
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'acme/api' })).toBeInTheDocument()
  })

  it('диаграмма упала — остальная страница на месте, повтор перезагружает страницу', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reload = vi.spyOn(navigation, 'reload').mockImplementation(() => {})
    chart.fail = true
    render(async () => ANALYTICS)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Не удалось отобразить диаграмму')
    expect(screen.getByRole('cell', { name: 'acme/api' })).toBeInTheDocument()
    expect(screen.getAllByText('Прогонов').length).toBeGreaterThan(0)

    await user.click(within(alert).getByRole('button', { name: 'Повторить' }))
    // React.lazy не повторяет упавшую загрузку чанка: помогает только свежая страница.
    expect(reload).toHaveBeenCalledOnce()
  })

  it('смена фильтра не заменяет страницу загрузкой', async () => {
    const user = userEvent.setup()
    let release: () => void = () => {}
    let calls = 0
    render(async () => {
      calls += 1
      if (calls > 1) await new Promise<void>((resolve) => (release = resolve))
      return ANALYTICS
    })
    await screen.findByTestId('chart')

    await user.click(screen.getByText('7 дн.'))

    await waitFor(() => expect(calls).toBe(2))
    expect(screen.getByTestId('chart')).toBeInTheDocument()
    expect(screen.queryByText('Загрузка аналитики…')).not.toBeInTheDocument()
    release()
  })
})
