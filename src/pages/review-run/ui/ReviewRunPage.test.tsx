import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '../../../app/providers/AppProviders'
import { createQueryClient } from '../../../app/providers/queryClient'
import type { DiffFile } from '../../../entities/diff'
import type { ReviewFinding } from '../../../entities/review-finding'
import { RUN_POLL_INTERVAL_MS, type ReviewRun } from '../../../entities/review-run'
import { ApiError, type ApiTransport } from '../../../shared/api'
import {
  hunk,
  makeDiffFile,
  makeFileSummary,
  makeFinding,
  makePublishedComment,
  makeReviewRun,
} from '../../../test/factories'
import { initialReviewWorkspaceState, useReviewWorkspace } from '../../../widgets/review-workspace'
import { ReviewRunPage } from './ReviewRunPage'

const api = makeDiffFile({
  path: 'app/api.py',
  language: 'python',
  hunks: [
    hunk(1, 1, [
      ' import os',
      '-token = "secret"',
      '+token = os.environ["TOKEN"]',
      ' print(token)',
    ]),
  ],
})
const util = makeDiffFile({
  path: 'app/util.py',
  language: 'python',
  hunks: [hunk(10, 10, [' def a():', '+    return 1'])],
})

const leak = makeFinding({
  id: 'leak',
  file_path: 'app/api.py',
  side: 'new',
  new_line: 3,
  severity: 'critical',
  category: 'security',
  message: 'Токен печатается в лог.',
  suggestion: 'print("token loaded")',
})
const removed = makeFinding({
  id: 'removed',
  file_path: 'app/api.py',
  side: 'old',
  old_line: 2,
  new_line: null,
  severity: 'high',
  message: 'Секрет был в истории git — его надо отозвать.',
})
const general = makeFinding({
  id: 'general',
  file_path: 'app/api.py',
  new_line: null,
  severity: 'medium',
  message: 'Нет тестов на чтение окружения.',
})

type Backend = {
  run?: ReviewRun
  files?: DiffFile[]
  findings?: ReviewFinding[]
}

/** Подменяем адаптер данных, а не `fetch`: та же граница, что у HTTP-клиента. */
function fakeTransport({
  run = makeReviewRun(),
  files = [api, util],
  findings = [leak, removed, general],
}: Backend = {}): ApiTransport {
  return {
    get: async (path) => {
      const url = new URL(path, 'http://test')
      if (url.pathname === `/review-runs/${run.id}`) return run
      if (url.pathname.endsWith('/findings')) {
        return {
          findings,
          published_comments: [makePublishedComment({ finding_id: 'leak' })],
        }
      }
      if (url.pathname.endsWith('/files')) {
        return files.map((file) => makeFileSummary({ path: file.path }))
      }
      if (url.pathname.endsWith('/diff')) {
        const file = files.find((item) => item.path === url.searchParams.get('path'))
        if (file) return file
      }
      throw new ApiError(404, `not found: ${path}`)
    },
  }
}

function renderPage(transport: ApiTransport, runId = 'run-1') {
  const router = createMemoryRouter([{ path: '/review-runs/:runId', element: <ReviewRunPage /> }], {
    initialEntries: [`/review-runs/${runId}`],
  })
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false } })
  render(
    <AppProviders transport={transport} queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { queryClient }
}

describe('ReviewRunPage', () => {
  beforeEach(() => {
    useReviewWorkspace.setState(initialReviewWorkspaceState)
  })

  it('показывает метаданные прогона и сводку', async () => {
    const change_request = { provider: 'git', url: 'https://git.example.com/acme/api/42' }
    renderPage(fakeTransport({ run: makeReviewRun({ change_request }) }))

    expect(await screen.findByRole('heading', { name: 'Прогон ревью' })).toBeInTheDocument()
    expect(screen.getByText('Завершён')).toBeInTheDocument()
    expect(screen.getByText('claude-sonnet-5')).toBeInTheDocument()
    expect(screen.getByText('Чтение токена из окружения')).toBeInTheDocument()
    expect(screen.getByText('a.petrova')).toBeInTheDocument()
    expect(screen.getByText('feat/env-token → develop')).toBeInTheDocument()
    expect(screen.getByLabelText('Вердикт: Нужны правки')).toHaveTextContent('Оценка 42/100')
    expect(screen.getByRole('link', { name: /Открыть источник/ })).toHaveAttribute(
      'href',
      change_request.url,
    )
    const summary = await screen.findByRole('region', { name: 'Сводка' })
    expect(within(summary).getByText('Без привязки к строке')).toBeInTheDocument()
    expect(within(summary).getByText('Нет тестов на чтение окружения.')).toBeInTheDocument()
  })

  it('под строкой с замечанием рендерится карточка бага', async () => {
    renderPage(fakeTransport())

    const card = await screen.findByRole('article', { name: /Токен печатается в лог/ })
    expect(within(card).getByText('Critical')).toBeInTheDocument()
    expect(
      within(card).getByRole('figure', { name: 'Предлагаемое исправление' }),
    ).toHaveTextContent('Было: print(token)')
    expect(within(card).getByText(/^Опубликовано/)).toBeInTheDocument()
  })

  it('замечание к удалённой строке показывается на старой стороне', async () => {
    renderPage(fakeTransport())

    expect(
      await screen.findByRole('article', { name: /Секрет был в истории git/ }),
    ).toBeInTheDocument()
  })

  it('выбор файла показывает его дифф и сохраняет режим просмотра', async () => {
    const user = userEvent.setup()
    renderPage(fakeTransport())

    await user.click(await screen.findByRole('button', { name: 'Одна колонка' }))
    await user.click(screen.getByRole('button', { name: /app\/util\.py/ }))

    expect(await screen.findByRole('heading', { name: 'app/util.py' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /app\/util\.py/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Одна колонка' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('article', { name: /Токен печатается/ })).not.toBeInTheDocument()
  })

  it('без базовой ревизии объясняет, почему диффа нет', async () => {
    renderPage(fakeTransport({ run: makeReviewRun({ base_sha: null }) }))

    expect(await screen.findByText(/не сохранена базовая ревизия/)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Изменённые файлы' })).not.toBeInTheDocument()
  })

  it('незнакомый статус не роняет страницу', async () => {
    renderPage(fakeTransport({ run: makeReviewRun({ status: 'waiting_for_quota' }) }))

    expect(await screen.findByText('waiting_for_quota')).toBeInTheDocument()
  })

  it('INT-03: упавший прогон показывает причину и не выдаёт результат за полный', async () => {
    const run = makeReviewRun({
      status: 'failed',
      failure_reason: 'LLM не ответила за отведённое время',
      verdict: null,
      score: null,
    })
    renderPage(fakeTransport({ run }))

    expect(await screen.findByText('Ошибка')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('LLM не ответила за отведённое время')
    expect(screen.getByText('Вердикта нет')).toBeInTheDocument()
    expect(await screen.findByText(/список замечаний может быть неполным/)).toBeInTheDocument()
  })

  it('INT-04: без замечаний это сказано явно', async () => {
    renderPage(fakeTransport({ findings: [] }))

    expect(await screen.findByText('Замечаний нет.')).toBeInTheDocument()
  })

  it('INT-06: выбранный файл и режим переживают refetch', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderPage(fakeTransport())

    await user.click(await screen.findByRole('button', { name: /app\/util\.py/ }))
    await user.click(screen.getByRole('button', { name: 'Одна колонка' }))
    await act(() => queryClient.invalidateQueries())

    expect(await screen.findByRole('heading', { name: 'app/util.py' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /app\/util\.py/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Одна колонка' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('несуществующий прогон — понятное сообщение', async () => {
    renderPage(fakeTransport(), 'missing')

    expect(await screen.findByRole('alert')).toHaveTextContent('Прогон не найден')
  })

  it('ответ вне контракта не попадает в UI', async () => {
    const broken: ApiTransport = { get: async () => ({ id: 'run-1' }) }
    renderPage(broken)

    expect(await screen.findByRole('alert')).toHaveTextContent('не соответствует контракту')
  })

  describe('активный прогон', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('опрашивается до терминального статуса и подтягивает замечания', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const statuses = ['analysing', 'publishing', 'completed']
      let polls = 0
      const backend = fakeTransport()
      const transport: ApiTransport = {
        get: async (path) => {
          if (path === '/review-runs/run-1') {
            const status = statuses[Math.min(polls++, statuses.length - 1)]
            const done = status === 'completed'
            return makeReviewRun({
              status,
              verdict: done ? 'comment' : null,
              score: done ? 71 : null,
            })
          }
          if (path.endsWith('/findings') && polls < 2) {
            return { findings: [], published_comments: [] }
          }
          return backend.get(path)
        },
      }
      const tick = () => act(() => vi.advanceTimersByTimeAsync(RUN_POLL_INTERVAL_MS))

      renderPage(transport)

      expect(await screen.findByText('Анализ')).toBeInTheDocument()
      expect(screen.getByText('Вердикт появится после завершения')).toBeInTheDocument()
      expect(screen.queryByRole('article', { name: /Токен печатается/ })).not.toBeInTheDocument()

      await tick()
      expect(await screen.findByText('Публикация')).toBeInTheDocument()

      await tick()
      expect(await screen.findByText('Завершён')).toBeInTheDocument()
      expect(screen.getByLabelText('Вердикт: Есть замечания')).toHaveTextContent('Оценка 71/100')
      expect(await screen.findByRole('article', { name: /Токен печатается/ })).toBeInTheDocument()

      // После терминального статуса опрос прекращается.
      const pollsWhenDone = polls
      await tick()
      await tick()
      expect(polls).toBe(pollsWhenDone)
    })

    it('INT-07: отменённый прогон завершён — ожидание прекращается', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      let polls = 0
      const backend = fakeTransport()
      const transport: ApiTransport = {
        get: async (path) => {
          if (path === '/review-runs/run-1') {
            polls++
            return makeReviewRun({ status: 'cancelled', verdict: null, score: null })
          }
          return backend.get(path)
        },
      }

      renderPage(transport)

      expect(await screen.findByText('Отменён')).toBeInTheDocument()
      expect(screen.getByText('Вердикта нет')).toBeInTheDocument()
      expect(await screen.findByText(/список замечаний может быть неполным/)).toBeInTheDocument()

      await act(() => vi.advanceTimersByTimeAsync(RUN_POLL_INTERVAL_MS * 3))
      expect(polls).toBe(1)
    })
  })
})
