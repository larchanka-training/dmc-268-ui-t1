import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReviewFinding } from '../../../entities/review-finding'
import { toApiDiffFile, type DiffFile } from '../../../entities/diff'
import type { ReviewRun } from '../../../entities/review-run'
import type { ReviewRunStep } from '../../../entities/review-run-step'
import { initialFilterFindingsState, useFilterFindings } from '../../../features/filter-findings'
import { ApiError, type ApiTransport } from '../../../shared/api'
import { createFakeEventStream, type FakeEventStream } from '../../../test/fakeEventStream'
import {
  hunk,
  makeDiffFile,
  makeFinding,
  makePublishedComment,
  makeReviewRun,
  makeStep,
} from '../../../test/factories'
import { initialReviewWorkspaceState, useReviewWorkspace } from '../../../widgets/review-workspace'
import { fakeTransport } from '../../../test/api'
import { reviewDiffPath, reviewPath, reviewStepsPath } from '../model/review'
import { AppProviders } from '../../../app/providers/AppProviders'
import { createQueryClient } from '../../../app/providers/queryClient'
import { ReviewRunView } from './ReviewRunView'

const api = makeDiffFile({
  path: 'app/api.py',
  language: 'python',
  // Контекст дальше трёх строк от изменения сворачивается: `helper` и `far` скрыты до раскрытия.
  hunks: [
    hunk(1, 1, [
      ' import os',
      '-token = "secret"',
      '+token = os.environ["TOKEN"]',
      ' print(token)',
      ' # 1',
      ' # 2',
      ' def helper():',
      '     return 42',
      ' # 3',
      ' # 4',
      ' def main():',
      '+    run()',
    ]),
    hunk(30, 30, [' def far():', ' # 5', ' # 6', ' def tail():', '+    pass']),
  ],
})
const util = makeDiffFile({
  path: 'app/util.py',
  language: 'python',
  hunks: [hunk(10, 10, [' def a():', '+    return 1'])],
})
const logo = makeDiffFile({
  path: 'docs/logo.png',
  language: 'binary',
  is_binary: true,
  hunks: [],
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
  steps?: ReviewRunStep[]
  /** `false` — дифф и шаги бэкенд ещё не реализовал: оба пути отвечают `501`. */
  planned?: boolean
}

/** Подменяем adapter данных, а не `fetch`: та же граница, что у HTTP-клиента. */
function fakeAdapter(source: Backend | ((path: string) => Backend) = {}): ApiTransport {
  return fakeTransport({
    get: async (path) => {
      const {
        run = makeReviewRun(),
        files = [api, util],
        findings = [leak, removed, general],
        steps = [],
        planned = true,
      } = typeof source === 'function' ? source(path) : source
      if (path === reviewPath(run.id)) {
        return {
          ...run,
          findings,
          published_comments: [makePublishedComment({ finding_id: 'leak' })],
        }
      }
      if (path === reviewDiffPath(run.id) || path === reviewStepsPath(run.id)) {
        if (!planned) throw new ApiError(501, path, 'NOT_IMPLEMENTED')
        return path === reviewDiffPath(run.id)
          ? { files: files.map(toApiDiffFile) }
          : { items: steps }
      }
      throw new ApiError(404, path)
    },
  })
}

/** Текст области изменений: подсветка режет строку кода на отдельные узлы. */
const progress = () => screen.getByRole('region', { name: 'Прогресс прогона' })

const changesText = () => screen.getByRole('region', { name: 'Изменения' }).textContent ?? ''

let stream: FakeEventStream

/** Экран живёт под маршрутом `/reviews/:reviewId`; по умолчанию — id прогона из фабрики. */
function renderView(adapter: ApiTransport, reviewId = makeReviewRun().id) {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false } })
  render(
    <AppProviders transport={adapter} eventStream={stream} queryClient={queryClient}>
      <MemoryRouter initialEntries={[`/reviews/${reviewId}`]}>
        <Routes>
          <Route path="/reviews/:reviewId" element={<ReviewRunView />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
  return { queryClient }
}

describe('ReviewRunView', () => {
  beforeEach(() => {
    stream = createFakeEventStream()
    useReviewWorkspace.setState(initialReviewWorkspaceState)
    useFilterFindings.setState(initialFilterFindingsState)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('пока adapter не ответил, экран говорит, что идёт загрузка', () => {
    renderView(fakeTransport({ get: () => new Promise(() => {}) }))

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем прогон')
  })

  it('запрашивает прогон по id из адреса', async () => {
    const paths: string[] = []
    const adapter = fakeAdapter({ run: makeReviewRun({ id: 'a1b2-c3' }) })
    renderView(
      fakeTransport({
        get: (path) => {
          paths.push(path)
          return adapter.get(path)
        },
      }),
      'a1b2-c3',
    )

    expect(await screen.findByText('Прогон ревью')).toBeInTheDocument()
    expect(paths).toContain('/reviews/a1b2-c3')
    expect(paths).toContain('/reviews/a1b2-c3/diff')
    expect(paths).toContain('/reviews/a1b2-c3/steps')
  })

  it('бэкенд ещё не отдаёт дифф и шаги (501) — замечания списком', async () => {
    renderView(fakeAdapter({ planned: false }))

    const list = await screen.findByRole('region', { name: 'Замечания' })
    expect(within(list).getByRole('article', { name: /Токен печатается в лог/ })).toBeVisible()
    expect(within(list).getByText('app/api.py:3')).toBeInTheDocument()
    // Вердикт считается по замечаниям и без диффа.
    expect(screen.getByLabelText('Вердикт: Нужны правки')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Изменения' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ход прогона' })).not.toBeInTheDocument()
  })

  it('неизвестный id — «Прогон не найден», без повтора', async () => {
    renderView(fakeAdapter(), 'nope')

    expect(await screen.findByRole('alert')).toHaveTextContent('Прогон не найден')
    expect(screen.queryByRole('button', { name: 'Повторить' })).not.toBeInTheDocument()
  })

  it('GitHub недоступен при проверке видимости (502) — ошибка с повтором, повтор показывает прогон', async () => {
    const backend = fakeAdapter()
    let githubDown = true
    renderView(
      fakeTransport({
        get: async (path) => {
          if (githubDown) throw new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
          return backend.get(path)
        },
      }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Не удалось загрузить прогон')
    githubDown = false
    await userEvent.click(within(alert).getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText(makeReviewRun().merge_request.title)).toBeInTheDocument()
  })

  it('дифф не загрузился из-за GitHub (502) — замечания списком, без ошибки', async () => {
    const backend = fakeAdapter()
    const requested: string[] = []
    const diffPath = reviewDiffPath(makeReviewRun().id)
    renderView(
      fakeTransport({
        get: async (path) => {
          requested.push(path)
          if (path === diffPath) throw new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
          return backend.get(path)
        },
      }),
    )

    expect(await screen.findByText(makeReviewRun().merge_request.title)).toBeInTheDocument()
    await waitFor(() => expect(requested).toContain(diffPath))
    expect(screen.queryByText(/Не удалось/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Изменения' })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: /Токен печатается/ })).toBeInTheDocument()
  })

  it.each([
    ['GitHub недоступен (502)', 502, 'SCM_UNAVAILABLE'],
    ['прогона нет (404)', 404, 'REVIEW_NOT_FOUND'],
  ])(
    'ход прогона не загрузился: %s — ошибка с повтором на его месте, прогон на экране',
    async (_, status, code) => {
      const backend = fakeAdapter({ steps: [makeStep({ stage: 'fetching_diff' })] })
      const stepsPath = reviewStepsPath(makeReviewRun().id)
      let failing = true
      renderView(
        fakeTransport({
          get: async (path) => {
            if (failing && path === stepsPath) throw new ApiError(status, 'Сбой', code)
            return backend.get(path)
          },
        }),
      )

      expect(await screen.findByText(makeReviewRun().merge_request.title)).toBeInTheDocument()
      const problem = (
        await screen.findByText('Не удалось загрузить ход прогона')
      ).closest<HTMLElement>('[role="alert"]')
      if (!problem) throw new Error('ошибка хода прогона без role="alert"')
      failing = false
      await userEvent.click(within(problem).getByRole('button', { name: 'Повторить' }))

      expect(await screen.findByRole('list', { name: 'Шаги прогона' })).toBeInTheDocument()
    },
  )

  it('бинарный файл не притворяется диффом', async () => {
    const user = userEvent.setup()
    renderView(fakeAdapter({ files: [api, logo], findings: [] }))

    await user.click(await screen.findByRole('button', { name: /docs\/logo\.png/ }))

    // Просмотрщик грузится отдельным чанком, поэтому ответ ждём, а не читаем сразу.
    expect(await screen.findByText('Бинарный файл — текстового диффа нет.')).toBeVisible()
  })

  it('замечание без строки видно в сводке, а не теряется', async () => {
    renderView(fakeAdapter())
    const summary = await screen.findByRole('region', { name: 'Сводка' })

    expect(within(summary).getByRole('heading', { name: 'Без привязки к строке' })).toBeVisible()
    expect(
      within(summary).getByRole('article', { name: /Нет тестов на чтение окружения/ }),
    ).toBeInTheDocument()
  })

  it('показывает метаданные прогона и сводку', async () => {
    const url = 'https://github.com/acme/api/pull/7'
    const merge_request = { ...makeReviewRun().merge_request, url }
    renderView(fakeAdapter({ run: makeReviewRun({ merge_request }) }))

    expect(await screen.findByRole('heading', { name: 'Прогон ревью' })).toBeInTheDocument()
    expect(screen.getByText('Завершён')).toBeInTheDocument()
    expect(screen.getByText('Чтение токена из окружения')).toBeInTheDocument()
    expect(screen.getByText('a.petrova')).toBeInTheDocument()
    expect(screen.getByText('feat/env-token → develop')).toBeInTheDocument()
    // Вердикт выводится из замечаний: среди них critical.
    expect(screen.getByLabelText('Вердикт: Нужны правки')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Открыть запрос на изменение/ })).toHaveAttribute(
      'href',
      url,
    )
    const summary = screen.getByRole('region', { name: 'Сводка' })
    expect(within(summary).getByText('Нет тестов на чтение окружения.')).toBeInTheDocument()
  })

  it('INT-01: под строкой с замечанием рендерится карточка на своей стороне', async () => {
    renderView(fakeAdapter())

    const card = await screen.findByRole('article', { name: /Токен печатается в лог/ })
    expect(within(card).getByText('Critical')).toBeInTheDocument()
    expect(
      within(card).getByRole('figure', { name: 'Предлагаемое исправление' }),
    ).toHaveTextContent('Было: print(token)')
    expect(within(card).getByText(/^Опубликовано/)).toBeInTheDocument()
    expect(
      await screen.findByRole('article', { name: /Секрет был в истории git/ }),
    ).toBeInTheDocument()
  })

  it('выбор файла показывает его дифф и сохраняет режим просмотра', async () => {
    const user = userEvent.setup()
    renderView(fakeAdapter())

    await user.click(await screen.findByRole('button', { name: 'Одна колонка' }))
    await user.click(screen.getByRole('button', { name: /app\/util\.py/ }))

    expect(await screen.findByRole('heading', { name: 'app/util.py' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Одна колонка' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('article', { name: /Токен печатается/ })).not.toBeInTheDocument()
  })

  it('свёрнутый контекст раскрывается, не задевая другой hunk', async () => {
    const user = userEvent.setup()
    renderView(fakeAdapter())

    await screen.findByRole('article', { name: /Токен печатается/ })
    expect(changesText()).not.toContain('return 42')

    await user.click(screen.getByRole('button', { name: /Показать 2 скрытых строк$/ }))

    await waitFor(() => expect(changesText()).toContain('return 42'))
    expect(changesText()).not.toContain('far()')
    expect(
      screen.getByRole('button', { name: /Показать 1 скрытых строк выше/ }),
    ).toBeInTheDocument()
  })

  it('фильтр по severity прячет остальные замечания в диффе', async () => {
    const user = userEvent.setup()
    renderView(fakeAdapter())

    await screen.findByRole('article', { name: /Токен печатается/ })
    await user.click(screen.getByRole('button', { name: /^High · 1$/ }))

    expect(screen.queryByRole('article', { name: /Токен печатается/ })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: /Секрет был в истории git/ })).toBeInTheDocument()
  })

  it('RunInspector показывает шаги прогона: этап, статус, токены, код ошибки', async () => {
    const steps = [
      makeStep({ stage: 'fetching_diff' }),
      makeStep({ stage: 'analysing', status: 'failed', error_code: 'LLM_TIMEOUT' }),
      makeStep({ stage: 'analysing', tokens_used: 41320 }),
      makeStep({ stage: 'verifying', status: 'running', duration_seconds: null }),
    ]
    renderView(fakeAdapter({ steps }))

    const list = await screen.findByRole('list', { name: 'Шаги прогона' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Получение диффа'),
      expect.stringContaining('LLM_TIMEOUT'),
      expect.stringMatching(/41\s320 токенов/),
      expect.stringContaining('выполняется'),
    ])
  })

  it('упавшая проверка замечаний у завершённого прогона — предупреждение, а не ошибка', async () => {
    const steps = [
      makeStep({ stage: 'analysing' }),
      makeStep({ stage: 'verifying', status: 'failed', error_code: 'LLM_UNAVAILABLE' }),
    ]
    renderView(fakeAdapter({ run: makeReviewRun({ status: 'completed' }), steps }))

    const list = await screen.findByRole('list', { name: 'Шаги прогона' })
    const verifying = within(list).getAllByRole('listitem')[1]
    expect(verifying).toHaveTextContent('не перепроверено')
    expect(verifying).toHaveTextContent('Замечания не перепроверены')
    expect(verifying).not.toHaveTextContent('ошибка')
    expect(within(verifying).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('упавшая проверка у упавшего прогона — по-прежнему ошибка', async () => {
    const steps = [
      makeStep({ stage: 'verifying', status: 'failed', error_code: 'LLM_UNAVAILABLE' }),
    ]
    renderView(
      fakeAdapter({ run: makeReviewRun({ status: 'failed', failed_stage: 'analysing' }), steps }),
    )

    const list = await screen.findByRole('list', { name: 'Шаги прогона' })
    expect(within(list).getByRole('listitem')).toHaveTextContent('ошибка')
    expect(within(list).getByRole('alert')).toHaveTextContent('LLM_UNAVAILABLE')
  })

  it('вердикт выводится из замечаний завершённого прогона', async () => {
    renderView(fakeAdapter({ findings: [general] }))
    expect(await screen.findByLabelText('Вердикт: Есть замечания')).toBeInTheDocument()
  })

  it('без замечаний — можно мёржить', async () => {
    renderView(fakeAdapter({ findings: [] }))
    expect(await screen.findByLabelText('Вердикт: Можно мёржить')).toBeInTheDocument()
  })

  it('INT-02: идущий прогон показан идущим, вердикта ещё нет', async () => {
    renderView(fakeAdapter({ run: makeReviewRun({ status: 'analysing' }) }))

    expect(await screen.findByText('Анализ')).toBeInTheDocument()
    expect(screen.getByText('Вердикт появится после завершения')).toBeInTheDocument()
  })

  it('INT-03: упавший прогон показывает причину и не выдаёт результат за полный', async () => {
    const run = makeReviewRun({
      status: 'failed',
      failure_reason: 'LLM не ответила за отведённое время',
    })
    renderView(fakeAdapter({ run }))

    expect(await screen.findByText('Ошибка')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('LLM не ответила за отведённое время')
    expect(screen.getByText('Вердикта нет')).toBeInTheDocument()
    expect(screen.getByText(/список замечаний может быть неполным/)).toBeInTheDocument()
  })

  it('INT-04: без замечаний это сказано явно', async () => {
    renderView(fakeAdapter({ findings: [] }))

    expect(await screen.findByText('Замечаний нет.')).toBeInTheDocument()
  })

  it('INT-05: ответ вне схемы — ошибка и возможность повторить', async () => {
    renderView(fakeTransport({ get: async () => ({ id: 'run-1' }) }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('не соответствует контракту')
    expect(within(alert).getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
  })

  it('INT-06: выбранный файл, режим и раскрытый контекст переживают refetch', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderView(fakeAdapter())

    await screen.findByRole('article', { name: /Токен печатается/ })
    await user.click(screen.getByRole('button', { name: /Показать 2 скрытых строк$/ }))
    await user.click(screen.getByRole('button', { name: 'Одна колонка' }))
    await act(() => queryClient.invalidateQueries())

    await waitFor(() => expect(changesText()).toContain('return 42'))
    expect(screen.getByRole('button', { name: 'Одна колонка' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: /app\/util\.py/ }))
    await act(() => queryClient.invalidateQueries())
    expect(screen.getByRole('button', { name: /app\/util\.py/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('INT-07: отменённый прогон показан завершённым, результат — неполным', async () => {
    renderView(fakeAdapter({ run: makeReviewRun({ status: 'cancelled' }) }))

    // «Отменён» — и значок статуса, и подпись прогресса.
    expect(await screen.findAllByText('Отменён')).toHaveLength(2)
    expect(screen.getByText('Вердикта нет')).toBeInTheDocument()
    expect(screen.getByText(/список замечаний может быть неполным/)).toBeInTheDocument()
  })

  it('INT-08: незнакомый статус не роняет экран и показан идущим', async () => {
    renderView(fakeAdapter({ run: makeReviewRun({ status: 'waiting_for_quota' }) }))

    expect(await screen.findByText('waiting_for_quota')).toBeInTheDocument()
    expect(screen.getByText('Вердикт появится после завершения')).toBeInTheDocument()
  })

  it('без базовой ревизии объясняет, почему диффа нет', async () => {
    renderView(fakeAdapter({ run: makeReviewRun({ base_sha: null }) }))

    expect(await screen.findByText(/не сохранена базовая ревизия/)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Изменённые файлы' })).not.toBeInTheDocument()
  })
  describe('статус в реальном времени', () => {
    it('INT-09: смена статуса по событию видна без перезагрузки', async () => {
      renderView(fakeAdapter({ run: makeReviewRun({ status: 'analysing' }) }))
      await screen.findByText('Анализ')

      act(() => stream.emitRun({ status: 'publishing' }))

      await waitFor(() =>
        expect(within(progress()).getByText('Публикация')).toHaveTextContent('выполняется'),
      )
      expect(within(progress()).getByText('Анализ LLM')).toHaveTextContent('завершён')
    })

    it('смена статуса по событию перезапрашивает ход прогона, без таймеров', async () => {
      let backend: Backend = {
        run: makeReviewRun({ status: 'analysing' }),
        steps: [makeStep({ stage: 'analysing', status: 'running', duration_seconds: null })],
      }
      const adapter = fakeAdapter(() => backend)
      const stepsPath = reviewStepsPath(makeReviewRun().id)
      let stepRequests = 0
      renderView(
        fakeTransport({
          get: async (path) => {
            if (path === stepsPath) stepRequests += 1
            return adapter.get(path)
          },
        }),
      )
      const list = await screen.findByRole('list', { name: 'Шаги прогона' })
      const before = stepRequests

      backend = {
        ...backend,
        steps: [
          makeStep({ stage: 'analysing' }),
          makeStep({ stage: 'publishing', status: 'running', duration_seconds: null }),
        ],
      }
      act(() => stream.emitRun({ status: 'publishing' }))

      await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(2))
      expect(stepRequests).toBe(before + 1)
    })

    it('INT-23: события чужого прогона и незнакомого типа экран не меняют', async () => {
      renderView(fakeAdapter({ run: makeReviewRun({ status: 'analysing' }) }))
      await screen.findByText('Анализ')

      act(() => stream.emitRun({ id: 'run-2', status: 'publishing' }))
      act(() => stream.emit('repository.synced', { id: 'run-1', status: 'publishing' }))

      expect(within(progress()).getByText('Публикация')).not.toHaveTextContent('выполняется')
      expect(stream.active()).toBe(1)

      act(() => stream.emitRun({ status: 'publishing' }))
      await waitFor(() =>
        expect(within(progress()).getByText('Публикация')).toHaveTextContent('выполняется'),
      )
    })

    it('INT-10: прогон доходит до completed, замечания и вердикт появляются сами', async () => {
      let backend: Backend = {
        run: makeReviewRun({ status: 'analysing' }),
        findings: [],
      }
      renderView(fakeAdapter(() => backend))
      expect(await screen.findByText(/Ревью ещё идёт/)).toBeInTheDocument()
      expect(screen.queryByRole('article', { name: /Токен печатается/ })).not.toBeInTheDocument()

      // К завершению сервер отдаёт замечания и вердикт; событие только сообщает о статусе.
      backend = { run: makeReviewRun({ status: 'completed' }) }
      act(() => stream.emitRun({ status: 'completed' }, 'run.finished'))

      expect(await screen.findByRole('article', { name: /Токен печатается/ })).toBeInTheDocument()
      expect(screen.getByLabelText('Вердикт: Нужны правки')).toBeInTheDocument()
      expect(within(progress()).getByText('Публикация')).toHaveTextContent('завершён')
      expect(stream.active()).toBe(0)
    })

    it('перезапрос после run.finished упал (502) — прогон остаётся, плашка с повтором', async () => {
      let backend: Backend = { run: makeReviewRun({ status: 'analysing' }), findings: [] }
      let githubDown = false
      const adapter = fakeAdapter(() => backend)
      renderView(
        fakeTransport({
          get: async (path) => {
            if (githubDown) throw new ApiError(502, 'GitHub недоступен', 'SCM_UNAVAILABLE')
            return adapter.get(path)
          },
        }),
      )
      expect(await screen.findByText(/Ревью ещё идёт/)).toBeInTheDocument()

      githubDown = true
      backend = { run: makeReviewRun({ status: 'completed' }) }
      act(() => stream.emitRun({ status: 'completed' }, 'run.finished'))

      const title = await screen.findByText('Не удалось обновить прогон')
      const notice = title.closest<HTMLElement>('[role="alert"]')
      if (!notice) throw new Error('плашка «Не удалось обновить прогон» без role="alert"')
      expect(screen.queryByText('Не удалось загрузить прогон')).not.toBeInTheDocument()
      expect(screen.getByText(makeReviewRun().merge_request.title)).toBeInTheDocument()

      githubDown = false
      await userEvent.click(within(notice).getByRole('button', { name: 'Повторить' }))

      expect(await screen.findByRole('article', { name: /Токен печатается/ })).toBeInTheDocument()
      expect(screen.queryByText('Не удалось обновить прогон')).not.toBeInTheDocument()
    })

    it('INT-11: сбой по событию показывает этап и причину', async () => {
      let backend: Backend = {
        run: makeReviewRun({ status: 'analysing' }),
      }
      renderView(fakeAdapter(() => backend))
      await screen.findByText('Анализ')

      backend = {
        run: makeReviewRun({
          status: 'failed',
          failed_stage: 'analysing',
          failure_reason: 'LLM не ответила',
        }),
      }
      // Причины сбоя в событии нет: она приходит перезапросом прогона после `run.finished`.
      act(() => stream.emitRun({ status: 'failed', failed_stage: 'analysing' }, 'run.finished'))

      expect(await screen.findByText('Ошибка')).toBeInTheDocument()
      expect(within(progress()).getByText('Анализ LLM')).toHaveTextContent('ошибка')
      expect(within(progress()).getByText('LLM не ответила')).toBeInTheDocument()
    })

    it('INT-12: отказ сервера в подписке не прячет прогон, а «Обновить» открывает поток заново', async () => {
      const user = userEvent.setup()
      renderView(fakeAdapter({ run: makeReviewRun({ status: 'analysing' }) }))
      await screen.findByText('Анализ')

      act(() => stream.setState('failed'))
      expect(await screen.findByText('Не удалось получить обновления статуса')).toBeInTheDocument()
      expect(screen.getByText('Анализ')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Обновить' }))

      await waitFor(() => expect(stream.opened).toHaveLength(2))
    })

    it('INT-20: идущий прогон без событий не опрашивается по таймеру', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      stream = createFakeEventStream({ autoOpen: true })
      const inner = fakeAdapter({
        run: makeReviewRun({ status: 'analysing' }),
      })
      const get = vi.fn(inner.get)
      renderView(fakeTransport({ get }))
      await screen.findByText('Анализ')

      await act(() => vi.advanceTimersByTimeAsync(10 * 60 * 1000))

      // Первая загрузка и снимок после `open`; дифф — только первая загрузка.
      const requests = (path: string) => get.mock.calls.filter(([called]) => called === path)
      expect(requests(reviewPath('run-1'))).toHaveLength(2)
      expect(requests(reviewDiffPath('run-1'))).toHaveLength(1)
      expect(screen.getByText('Анализ')).toBeInTheDocument()
    })

    it('снимок, прочитанный до события, не откатывает этап, замечания из него появляются', async () => {
      let backend: Backend = { run: makeReviewRun({ status: 'building_context' }), findings: [] }
      let gate: Promise<void> | null = null
      const inner = fakeAdapter(() => backend)
      renderView(
        fakeTransport({
          get: async (path) => {
            // Сервер прочитал прогон сейчас, ответ задерживается до `gate`.
            const answer = inner.get(path)
            if (gate && path === reviewPath('run-1')) await gate
            return answer
          },
        }),
      )
      await waitFor(() =>
        expect(within(progress()).getByText('Сбор контекста')).toHaveTextContent('выполняется'),
      )

      let respond = () => {}
      gate = new Promise((resolve) => {
        respond = resolve
      })
      backend = { run: makeReviewRun({ status: 'building_context' }) }
      act(() => stream.setState('open'))
      act(() => stream.emitRun({ status: 'analysing' }))
      await waitFor(() =>
        expect(within(progress()).getByText('Анализ LLM')).toHaveTextContent('выполняется'),
      )

      await act(async () => respond())

      expect(await screen.findByRole('article', { name: /Токен печатается/ })).toBeInTheDocument()
      expect(within(progress()).getByText('Анализ LLM')).toHaveTextContent('выполняется')
    })

    it('INT-21: при обрыве соединения замечания и данные прогона остаются на экране', async () => {
      renderView(fakeAdapter({ run: makeReviewRun({ status: 'analysing' }) }))
      await screen.findByRole('article', { name: /Токен печатается/ })

      act(() => stream.emitRun({ status: 'publishing' }))
      await waitFor(() =>
        expect(within(progress()).getByText('Публикация')).toHaveTextContent('выполняется'),
      )
      act(() => stream.setState('reconnecting'))

      expect(screen.getByRole('article', { name: /Токен печатается/ })).toBeInTheDocument()
      expect(screen.getByRole('article', { name: /Секрет был в истории git/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /app\/util\.py/ })).toBeInTheDocument()
    })
  })

  describe('фильтры', () => {
    const routes = makeDiffFile({
      path: 'server/api/routes.py',
      language: 'python',
      hunks: [hunk(1, 1, [' import fastapi', '+router = None'])],
    })
    const sqlFinding = makeFinding({
      id: 'sql',
      file_path: 'server/api/routes.py',
      new_line: 2,
      severity: 'low',
      message: 'Возможна SQL-инъекция',
    })
    const files = [api, util, routes]
    const findings = [leak, removed, general, sqlFinding]
    const fileList = () => screen.getByRole('navigation', { name: 'Изменённые файлы' })

    it('INT-13: поиск по пути оставляет только подходящие файлы', async () => {
      const user = userEvent.setup()
      renderView(fakeAdapter({ files, findings }))
      await screen.findByRole('navigation', { name: 'Изменённые файлы' })

      await user.type(screen.getByRole('textbox', { name: 'Поиск по пути файла' }), 'API/')

      const buttons = within(fileList()).getAllByRole('button')
      expect(buttons).toHaveLength(1)
      expect(buttons[0]).toHaveTextContent('server/api/routes.py')
    })

    it('INT-14: «Только с замечаниями» при severity critical оставляет файлы с critical', async () => {
      const user = userEvent.setup()
      renderView(fakeAdapter({ files, findings }))
      await screen.findByRole('navigation', { name: 'Изменённые файлы' })

      await user.click(screen.getByRole('button', { name: /^Critical · 1$/ }))
      await user.click(screen.getByRole('switch', { name: 'Только с замечаниями' }))

      const buttons = within(fileList()).getAllByRole('button')
      expect(buttons).toHaveLength(1)
      expect(buttons[0]).toHaveTextContent('app/api.py')
    })

    it('INT-15: выбранный файл скрыт фильтром — выбирается первый оставшийся', async () => {
      const user = userEvent.setup()
      renderView(fakeAdapter({ files, findings }))
      await user.click(await screen.findByRole('button', { name: /app\/util\.py/ }))
      expect(await screen.findByRole('heading', { name: 'app/util.py' })).toBeInTheDocument()

      await user.type(screen.getByRole('textbox', { name: 'Поиск по пути файла' }), 'routes')

      expect(
        await screen.findByRole('heading', { name: 'server/api/routes.py' }),
      ).toBeInTheDocument()
    })

    it('INT-16: поиск по тексту оставляет совпавшее замечание, остальные скрыты', async () => {
      const user = userEvent.setup()
      renderView(fakeAdapter({ files, findings }))
      await user.click(await screen.findByRole('button', { name: /server\/api\/routes\.py/ }))
      await screen.findByRole('article', { name: /SQL-инъекция/ })

      await user.type(screen.getByRole('textbox', { name: 'Поиск по тексту замечаний' }), 'sql')
      await user.click(screen.getByRole('button', { name: /app\/api\.py/ }))

      await waitFor(() =>
        expect(screen.queryByRole('article', { name: /Токен печатается/ })).not.toBeInTheDocument(),
      )
      expect(screen.getByText('Показано замечаний: 1 из 4')).toBeInTheDocument()
    })

    it('INT-17: severity и текст действуют вместе', async () => {
      const user = userEvent.setup()
      renderView(fakeAdapter({ files, findings }))
      await screen.findByRole('article', { name: /Токен печатается/ })

      await user.click(screen.getByRole('button', { name: /^High · 1$/ }))
      await user.click(screen.getByRole('button', { name: /^Critical · 1$/ }))
      await user.type(screen.getByRole('textbox', { name: 'Поиск по тексту замечаний' }), 'токен')

      await waitFor(() =>
        expect(
          screen.queryByRole('article', { name: /Секрет был в истории/ }),
        ).not.toBeInTheDocument(),
      )
      expect(screen.getByRole('article', { name: /Токен печатается/ })).toBeInTheDocument()
      expect(screen.getByText('Показано замечаний: 1 из 4')).toBeInTheDocument()
    })

    it('INT-18: ничего не найдено — сообщение и сброс всех фильтров', async () => {
      const user = userEvent.setup()
      renderView(fakeAdapter({ files, findings }))
      await screen.findByRole('navigation', { name: 'Изменённые файлы' })

      await user.type(screen.getByRole('textbox', { name: 'Поиск по пути файла' }), 'нет такого')
      await user.type(screen.getByRole('textbox', { name: 'Поиск по тексту замечаний' }), 'sql')

      expect(await screen.findByText(/не подходит ни один файл/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))

      expect(await screen.findByRole('article', { name: /Токен печатается/ })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Поиск по пути файла' })).toHaveValue('')
      expect(screen.getByRole('textbox', { name: 'Поиск по тексту замечаний' })).toHaveValue('')
      expect(within(fileList()).getAllByRole('button')).toHaveLength(3)
    })

    it('INT-17: severity ограничивает и текстовый поиск, а не только дополняет его', async () => {
      const user = userEvent.setup()
      const tokenHigh = makeFinding({
        id: 'token-high',
        file_path: 'app/api.py',
        new_line: 2,
        severity: 'high',
        message: 'Токен читается без проверки',
      })
      const tokenLow = makeFinding({
        id: 'token-low',
        file_path: 'app/util.py',
        new_line: 11,
        severity: 'low',
        message: 'Токен в README',
      })
      renderView(fakeAdapter({ files, findings: [leak, removed, general, tokenHigh, tokenLow] }))
      await screen.findByRole('article', { name: /Токен печатается/ })

      await user.type(screen.getByRole('textbox', { name: 'Поиск по тексту замечаний' }), 'токен')
      await waitFor(() =>
        expect(screen.getByText('Показано замечаний: 3 из 5')).toBeInTheDocument(),
      )
      await user.click(screen.getByRole('button', { name: /^High · 2$/ }))

      await waitFor(() =>
        expect(screen.queryByRole('article', { name: /Токен печатается/ })).not.toBeInTheDocument(),
      )
      expect(
        screen.getByRole('article', { name: /Токен читается без проверки/ }),
      ).toBeInTheDocument()
      expect(screen.getByText('Показано замечаний: 1 из 5')).toBeInTheDocument()
    })

    it('INT-22: счётчик замечаний у файла считается под фильтр severity', async () => {
      const user = userEvent.setup()
      renderView(fakeAdapter({ files, findings }))
      await screen.findByRole('article', { name: /Токен печатается/ })
      const apiButton = () => within(fileList()).getByRole('button', { name: /app\/api\.py/ })
      expect(apiButton()).toHaveTextContent('замечаний: 3')

      await user.click(screen.getByRole('button', { name: /^High · 1$/ }))

      await waitFor(() => expect(apiButton()).toHaveTextContent('замечаний: 1'))
      expect(apiButton()).not.toHaveTextContent('замечаний: 3')
    })

    it('INT-22: счётчик замечаний у файла считается под текстовый поиск', async () => {
      const user = userEvent.setup()
      renderView(fakeAdapter({ files, findings }))
      await screen.findByRole('article', { name: /Токен печатается/ })

      await user.type(screen.getByRole('textbox', { name: 'Поиск по тексту замечаний' }), 'sql')

      await waitFor(() =>
        expect(
          within(fileList()).getByRole('button', { name: /app\/api\.py/ }),
        ).not.toHaveTextContent('замечаний'),
      )
      expect(
        within(fileList()).getByRole('button', { name: /server\/api\/routes\.py/ }),
      ).toHaveTextContent('замечаний: 1')
    })

    it('INT-19: перезапрос завершённого прогона с новыми данными не сбрасывает фильтры и выбранный файл', async () => {
      const user = userEvent.setup()
      let responses = 0
      const extra = makeFinding({
        id: 'extra',
        file_path: 'app/util.py',
        new_line: 11,
        severity: 'medium',
        message: 'Новое замечание после перезапроса',
      })
      const { queryClient } = renderView(
        fakeAdapter((path) => {
          // Считаем ответы прогона; дополнения запрашиваются рядом и отдают ту же версию данных.
          if (path === reviewPath('run-1')) responses += 1
          return responses === 1
            ? { files, findings, run: makeReviewRun({ status: 'analysing' }) }
            : {
                files,
                findings: [...findings, extra],
                run: makeReviewRun({ status: 'completed', tokens_used: 20000 }),
              }
        }),
      )
      await user.click(await screen.findByRole('button', { name: /server\/api\/routes\.py/ }))
      await user.type(screen.getByRole('textbox', { name: 'Поиск по пути файла' }), 'api/')
      await user.click(screen.getByRole('button', { name: /^Low · 1$/ }))

      await act(() => queryClient.invalidateQueries())

      await waitFor(() =>
        expect(within(progress()).getByText('Публикация')).toHaveTextContent('завершён'),
      )
      expect(responses).toBe(2)
      expect(screen.getByRole('textbox', { name: 'Поиск по пути файла' })).toHaveValue('api/')
      expect(screen.getByRole('button', { name: /^Low · 1$/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(
        await screen.findByRole('heading', { name: 'server/api/routes.py' }),
      ).toBeInTheDocument()
    })
  })
})
