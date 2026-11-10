import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { theme } from 'antd'
import { MemoryRouter } from 'react-router-dom'

import { RequireAuth } from '@/features/auth'
import { OverviewPage } from '@/pages/OverviewPage'
import { ApiError } from '@/shared/api'
import { fakeTransport, ME, renderWithTransport, stubFetch } from '@/test/api'

/** Профиль — из `fetch` (`RequireAuth`), список репозиториев — через `ApiTransport`. */
const noRepositories = fakeTransport({ get: async () => ({ items: [], install_url: null }) })

describe('OverviewPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['name: null', { name: null, avatar_url: null }],
    ['name: пустая строка', { name: '', avatar_url: null }],
  ])('%s — приветствие с логином', async (_, patch) => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: { ...ME, ...patch } } })

    renderWithTransport(
      <MemoryRouter>
        <RequireAuth>
          <OverviewPage />
        </RequireAuth>
      </MemoryRouter>,
      noRepositories,
    )

    expect(await screen.findByText('С возвращением, octocat')).toBeInTheDocument()
  })

  it('с именем приветствует по имени', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })

    renderWithTransport(
      <MemoryRouter>
        <RequireAuth>
          <OverviewPage />
        </RequireAuth>
      </MemoryRouter>,
      noRepositories,
    )

    expect(await screen.findByText('С возвращением, The Octocat')).toBeInTheDocument()
  })

  it('считает только подключённые и не ведёт на удалённую страницу подключения', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    const row = (n: number, connected: boolean) => ({
      provider: 'github',
      provider_id: String(n),
      full_name: `acme/repo-${n}`,
      default_branch: 'main',
      connected,
      id: connected ? `repo-${n}` : null,
      can_connect: true,
      connected_at: connected ? '2026-10-01T10:00:00Z' : null,
      payer_login: null,
    })

    renderWithTransport(
      <MemoryRouter>
        <RequireAuth>
          <OverviewPage />
        </RequireAuth>
      </MemoryRouter>,
      fakeTransport({
        get: async () => ({
          items: [row(1, true), row(2, false), row(3, true)],
          install_url: null,
        }),
      }),
    )

    expect(await screen.findByText('2')).toBeInTheDocument()
    expect(screen.queryByText('Подключить репозиторий')).not.toBeInTheDocument()
  })

  it('репозитории не загрузились (502) — не «0», а ошибка с повтором', async () => {
    stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
    let githubDown = true
    renderWithTransport(
      <MemoryRouter>
        <RequireAuth>
          <OverviewPage />
        </RequireAuth>
      </MemoryRouter>,
      fakeTransport({
        get: async () => {
          if (githubDown) throw new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
          return { items: [], install_url: null }
        },
      }),
    )

    const problem = await screen.findByRole('alert')
    expect(problem).toHaveTextContent('Не удалось загрузить репозитории')
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    githubDown = false
    await userEvent.click(within(problem).getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('0')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  describe('баланс и «Я плачу за»', () => {
    const PAID = [
      { id: 'repo-1', full_name: 'acme/api' },
      { id: 'repo-2', full_name: 'acme/web' },
    ]

    function renderOverview(transport = noRepositories) {
      return renderWithTransport(
        <MemoryRouter>
          <RequireAuth>
            <OverviewPage />
          </RequireAuth>
        </MemoryRouter>,
        transport,
      )
    }

    // Цвет ошибки — токен темы по умолчанию: тест рендерит без `ThemeProvider`.
    const errorColor = theme.getDesignToken().colorError

    it('баланс в евро; положительный — без выделения', async () => {
      stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: { ...ME, balance_eur: '4.75' } } })
      renderOverview()

      expect(await screen.findByText('Баланс')).toBeInTheDocument()
      // Intl ставит неразрывные пробелы, нормализатор Testing Library сводит их к обычным.
      expect(screen.getByText('4,75 €')).not.toHaveStyle({ color: errorColor })
      expect(screen.getByText('Пополняет администратор сервиса')).toBeInTheDocument()
    })

    it('отрицательный баланс выделен цветом, знаки после запятой не теряются', async () => {
      stubFetch({
        'GET /api/v1/auth/me': { status: 200, body: { ...ME, balance_eur: '-1234.0000000001' } },
      })
      renderOverview()

      expect(await screen.findByText('-1 234,0000000001 €')).toHaveStyle({ color: errorColor })
    })

    it('не платит ни за что — так и сказано', async () => {
      stubFetch({ 'GET /api/v1/auth/me': { status: 200, body: ME } })
      renderOverview()

      expect(await screen.findByText('Вы не платите ни за один репозиторий.')).toBeInTheDocument()
    })

    it('«Перестать платить»: подтверждение, DELETE …/payer, профиль и репозитории перечитаны', async () => {
      const user = userEvent.setup()
      const routes = {
        'GET /api/v1/auth/me': { status: 200, body: { ...ME, paid_repositories: PAID } },
      }
      const fetchCalls = stubFetch(routes)
      const get = vi.fn(async () => ({ items: [], install_url: null }))
      const del = vi.fn(async () => {
        routes['GET /api/v1/auth/me'] = {
          status: 200,
          body: { ...ME, paid_repositories: [PAID[1]] },
        }
        return null
      })
      renderOverview(fakeTransport({ get, delete: del }))

      expect(await screen.findByText('Я плачу за')).toBeInTheDocument()
      expect(screen.getByText('acme/api')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Перестать платить за acme/api' }))
      const dialog = await screen.findByRole('dialog')
      expect(dialog).toHaveTextContent('Перестать платить за acme/api?')
      await user.click(within(dialog).getByRole('button', { name: 'Перестать платить' }))

      await waitFor(() => expect(screen.queryByText('acme/api')).not.toBeInTheDocument())
      expect(del).toHaveBeenCalledWith('/repositories/repo-1/payer')
      expect(screen.getByText('acme/web')).toBeInTheDocument()
      expect(fetchCalls).toHaveLength(2)
      expect(get).toHaveBeenCalledTimes(2)
    })

    it('две строки подряд: первая ждёт ответа — её кнопка занята и после второго подтверждения', async () => {
      const user = userEvent.setup()
      stubFetch({
        'GET /api/v1/auth/me': { status: 200, body: { ...ME, paid_repositories: PAID } },
      })
      // Первый DELETE не отвечает, второй отвечает сразу.
      const del = vi.fn((path: string) =>
        path === '/repositories/repo-1/payer' ? new Promise<null>(() => {}) : Promise.resolve(null),
      )
      renderOverview(fakeTransport({ get: noRepositories.get, delete: del }))
      const stopButton = (name: string) =>
        screen.getByRole('button', { name: `Перестать платить за ${name}` })
      const confirmStop = async (name: string) => {
        await user.click(stopButton(name))
        // Закрытое окно в jsdom остаётся в DOM (анимация не кончается), а id заголовка у окон
        // один и тот же: нужное окно ищем по тексту, а не по имени.
        const dialog = await waitFor(() => {
          const found = screen
            .getAllByRole('dialog')
            .find((d) => d.textContent?.includes(`Перестать платить за ${name}?`))
          expect(found).toBeDefined()
          return found!
        })
        await user.click(within(dialog).getByRole('button', { name: 'Перестать платить' }))
      }

      await screen.findByText('acme/api')
      await confirmStop('acme/api')
      await waitFor(() => expect(stopButton('acme/api')).toHaveAttribute('aria-busy', 'true'))
      await confirmStop('acme/web')

      await waitFor(() => expect(del).toHaveBeenCalledWith('/repositories/repo-2/payer'))
      await waitFor(() => expect(stopButton('acme/web')).toHaveAttribute('aria-busy', 'false'))
      expect(stopButton('acme/api')).toHaveAttribute('aria-busy', 'true')
      // Занятая кнопка не принимает нажатие: нового подтверждения и второго DELETE нет.
      const dialogs = screen.getAllByRole('dialog').length
      await user.click(stopButton('acme/api'))
      expect(screen.getAllByRole('dialog')).toHaveLength(dialogs)
      expect(del).toHaveBeenCalledTimes(2)
    })

    it('404 REPOSITORY_NOT_FOUND — виден detail ответа', async () => {
      const user = userEvent.setup()
      stubFetch({
        'GET /api/v1/auth/me': { status: 200, body: { ...ME, paid_repositories: PAID } },
      })
      const del = vi.fn(async () => {
        throw new ApiError(404, 'Репозиторий не найден', 'REPOSITORY_NOT_FOUND')
      })
      renderOverview(fakeTransport({ get: noRepositories.get, delete: del }))

      await user.click(await screen.findByRole('button', { name: 'Перестать платить за acme/web' }))
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: 'Перестать платить',
        }),
      )

      expect(await screen.findByText('Репозиторий не найден')).toBeInTheDocument()
    })
  })
})
