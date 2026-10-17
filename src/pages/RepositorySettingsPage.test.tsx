import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RepositorySettingsPage } from '@/pages/RepositorySettingsPage'
import * as store from '@/entities/repository/api/mockStore'

// Заглушки поверх реальных функций store: по умолчанию — сквозной вызов,
// в отдельных сценариях — ошибка или данные вне схемы на уровне adapter'а.
vi.mock('@/entities/repository/api/mockStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/repository/api/mockStore')>()
  return {
    ...actual,
    getRepositorySettings: vi.fn(actual.getRepositorySettings),
    getRulesStatus: vi.fn(actual.getRulesStatus),
    getRepositoryHistory: vi.fn(actual.getRepositoryHistory),
    saveRepositorySettings: vi.fn(actual.saveRepositorySettings),
  }
})

/** Фикстура repo-1 на старте: тесты сохранения меняют store, afterEach возвращает её. */
const REPO1_SETTINGS = store.getRepositorySettings('repo-1')

// Настоящие функции store: afterEach возвращает их как passthrough после подмен.
// restoreAllMocks для этого не годится — он не восстанавливает реализацию vi.fn(impl).
const actual = await vi.importActual<typeof import('@/entities/repository/api/mockStore')>(
  '@/entities/repository/api/mockStore',
)

/** Цепочка задержек mock adapter — 350 мс репозитории + 350 мс блок: ждём с запасом. */
const FIND = { timeout: 3000 }

function renderSettingsPage(repositoryId = 'repo-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/repositories/${repositoryId}/settings`]}>
        <Routes>
          <Route path="/repositories/:repositoryId/settings" element={<RepositorySettingsPage />} />
          {/* Заглушка экрана прогона: проверяем только переход по ссылке. */}
          <Route path="/reviews/:reviewId" element={<div>Экран прогона</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.mocked(store.getRepositorySettings).mockImplementation(actual.getRepositorySettings)
  vi.mocked(store.getRulesStatus).mockImplementation(actual.getRulesStatus)
  vi.mocked(store.getRepositoryHistory).mockImplementation(actual.getRepositoryHistory)
  vi.mocked(store.saveRepositorySettings).mockImplementation(actual.saveRepositorySettings)
  actual.saveRepositorySettings('repo-1', REPO1_SETTINGS)
})

describe('RepositorySettingsPage: загрузка', () => {
  it('форма показывает сохранённые значения repo-1', async () => {
    renderSettingsPage()

    expect(await screen.findByRole('switch', undefined, FIND)).toBeChecked()
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked()
    expect(screen.getByText('feature/**')).toBeInTheDocument()
    expect(screen.getByText('fix/**')).toBeInTheDocument()
  })

  it('репозиторий не найден: сообщение и путь назад, а не пустая страница', async () => {
    renderSettingsPage('repo-nope')

    expect(await screen.findByText('Репозиторий не найден')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'К списку репозиториев' })).toHaveAttribute(
      'href',
      '/repositories',
    )
  })
})

describe('RepositorySettingsPage: сохранение настроек', () => {
  it('успех: форма и данные показывают новые значения', async () => {
    const user = userEvent.setup()
    const { unmount } = renderSettingsPage()

    await screen.findByRole('switch', undefined, FIND)
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Настройки сохранены', undefined, FIND)).toBeInTheDocument()
    expect(store.getRepositorySettings('repo-1').autoReviewEnabled).toBe(false)

    // Новый заход на экран читает уже сохранённые значения.
    unmount()
    renderSettingsPage()
    expect(await screen.findByRole('switch', undefined, FIND)).not.toBeChecked()
  })

  it('ошибка: черновик остаётся в форме, store не меняется', async () => {
    vi.mocked(store.saveRepositorySettings).mockImplementationOnce(() => {
      throw new Error('Сеть недоступна')
    })
    const user = userEvent.setup()
    renderSettingsPage()

    await screen.findByRole('switch', undefined, FIND)
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(
      await screen.findByText('Не удалось сохранить настройки', undefined, FIND),
    ).toBeInTheDocument()
    expect(screen.getByText('Сеть недоступна')).toBeInTheDocument()
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(store.getRepositorySettings('repo-1').autoReviewEnabled).toBe(true)
  })

  it('поля заблокированы на время сохранения, после успеха форма совпадает с store', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    await screen.findByRole('switch', undefined, FIND)
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    // Сохранение в полёте (адаптер отвечает не мгновенно): правка невозможна, успеха ещё нет.
    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Low' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Сбросить' })).toBeDisabled()
    expect(screen.queryByText('Настройки сохранены')).not.toBeInTheDocument()

    expect(await screen.findByText('Настройки сохранены', undefined, FIND)).toBeInTheDocument()
    expect(screen.getByRole('switch')).not.toBeDisabled()
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(store.getRepositorySettings('repo-1').autoReviewEnabled).toBe(false)
  })

  it('сброс возвращает сохранённые значения', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    expect(await screen.findByRole('switch', undefined, FIND)).toBeChecked()
    await user.click(screen.getByRole('switch'))
    // Radio-кнопка antd прячет input от указателя — клик идёт по подписи.
    await user.click(screen.getByText('Critical'))
    expect(screen.getByRole('switch')).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Сбросить' }))

    expect(screen.getByRole('switch')).toBeChecked()
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked()
  })
})

describe('RepositorySettingsPage: статус правил', () => {
  it('repo-1: бейдж кастомных правил, превью правил и отклонённый раздел', async () => {
    renderSettingsPage()

    expect(await screen.findByText('Кастомные правила')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Performance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Style' })).toBeInTheDocument()
    // Чип паттерна повторяется у каждого правила с этим паттерном (Security и Performance).
    expect(screen.getAllByText('pattern: app/**/*.py')).toHaveLength(2)
    expect(screen.getByText('Docs — нет паттерна (pattern); нет проверок')).toBeInTheDocument()
  })

  it('repo-2: предупреждение о дефолтных правилах', async () => {
    renderSettingsPage('repo-2')

    expect(await screen.findByText('Дефолтные правила')).toBeInTheDocument()
    expect(screen.getByText(/Используются дефолтные правила/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Security' })).not.toBeInTheDocument()
  })

  it('repo-3: файл без применимых правил — не кастомные, отклонённые разделы видны', async () => {
    renderSettingsPage('repo-3')

    expect(await screen.findByText('Правила не применяются')).toBeInTheDocument()
    expect(screen.queryByText('Кастомные правила')).not.toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/ревью идёт по стандартным критериям/)
    expect(screen.getByText('Docs — нет паттерна (pattern); нет проверок')).toBeInTheDocument()
    expect(screen.getByText('A11y — нет паттерна (pattern)')).toBeInTheDocument()
  })
})

describe('RepositorySettingsPage: история проверок', () => {
  it('выбор прогона открывает экран его просмотра', async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    const runLink = await screen.findByRole('link', { name: 'Чтение токена из окружения' })
    expect(runLink).toHaveAttribute('href', '/reviews/run-42')
    await user.click(runLink)

    expect(await screen.findByText('Экран прогона')).toBeInTheDocument()
  })

  it('repo-2: проверок ещё не было', async () => {
    renderSettingsPage('repo-2')

    expect(await screen.findByText('Проверок ещё не было')).toBeInTheDocument()
  })

  it('незнакомый статус прогона показывается как есть и не ломает список', async () => {
    // Не Once: за прогон геттер может зваться повторно, mockImplementation покрывает все
    // вызовы и сбрасывается restoreAllMocks в afterEach.
    vi.mocked(store.getRepositoryHistory).mockImplementation(() => [
      {
        id: 'run-99',
        number: 99,
        title: 'Ребейз поверх develop',
        sourceBranch: 'feat/rebase',
        status: 'rebasing',
        createdAt: '2026-10-10T10:00:00Z',
      },
    ])
    renderSettingsPage()

    expect(await screen.findByText('rebasing', undefined, FIND)).toBeInTheDocument()
    expect(screen.getByText('Ребейз поверх develop')).toBeInTheDocument()
    // Время — одним форматтером с экраном прогона: Intl, UTC.
    expect(screen.getByText('10.10.2026, 10:00 UTC')).toBeInTheDocument()
  })
})

describe('RepositorySettingsPage: состояния данных', () => {
  it('ошибка одного блока не ломает остальные, повтор чинит блок', async () => {
    vi.mocked(store.getRulesStatus).mockImplementation(() => {
      throw new Error('rules boom')
    })
    const user = userEvent.setup()
    renderSettingsPage()

    expect(
      await screen.findByText('Не удалось загрузить статус правил', undefined, FIND),
    ).toBeInTheDocument()
    // Настройки и история работают.
    expect(await screen.findByRole('switch', undefined, FIND)).toBeChecked()
    expect(
      await screen.findByText('Чтение токена из окружения', undefined, FIND),
    ).toBeInTheDocument()

    // Чиним adapter и повторяем запрос блока.
    vi.mocked(store.getRulesStatus).mockImplementation(actual.getRulesStatus)
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('Кастомные правила', undefined, FIND)).toBeInTheDocument()
  })

  it('данные вне схемы: каждый блок показывает ошибку контракта, экран не падает', async () => {
    vi.mocked(store.getRepositorySettings).mockImplementation(
      () => ({ autoReviewEnabled: 'yes' }) as never,
    )
    vi.mocked(store.getRulesStatus).mockImplementation(() => ({ status: 'half-loaded' }) as never)
    vi.mocked(store.getRepositoryHistory).mockImplementation(() => [{ nope: true }] as never)
    renderSettingsPage()

    expect(
      await screen.findByText('Не удалось загрузить настройки', undefined, FIND),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Не удалось загрузить статус правил', undefined, FIND),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Не удалось загрузить историю проверок', undefined, FIND),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/не соответствует контракту/)).toHaveLength(3)
  })
})
