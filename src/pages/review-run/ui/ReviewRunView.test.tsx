import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DiffFile } from '../../../entities/diff'
import type { ReviewFinding } from '../../../entities/review-finding'
import type { ReviewRun } from '../../../entities/review-run'
import type { ReviewRunAction } from '../../../entities/review-run-action'
import { initialFilterFindingsState, useFilterFindings } from '../../../features/filter-findings'
import { ApiError, type ApiTransport } from '../../../shared/api'
import { createFakeEventStream, type FakeEventStream } from '../../../test/fakeEventStream'
import {
  hunk,
  makeAction,
  makeDiffFile,
  makeFileSummary,
  makeFinding,
  makePublishedComment,
  makeReviewRun,
} from '../../../test/factories'
import { initialReviewWorkspaceState, useReviewWorkspace } from '../../../widgets/review-workspace'
import { initialRunInspectorState, useRunInspector } from '../../../widgets/run-inspector'
import { mockReviewPath } from '../model/mockReview'
import { AppProviders } from '../../../app/providers/AppProviders'
import { createQueryClient } from '../../../app/providers/queryClient'
import { ReviewRunView } from './ReviewRunView'

const api = makeDiffFile({
  path: 'app/api.py',
  language: 'python',
  hunks: [
    hunk(1, 1, [
      ' import os',
      '-token = "secret"',
      '+token = os.environ["TOKEN"]',
      ' print(token)',
      '~def helper():',
      '~    return 42',
      ' def main():',
    ]),
    hunk(30, 30, ['~def far():', ' def tail():', '+    pass']),
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
  actions?: ReviewRunAction[]
}

/** Подменяем adapter данных, а не `fetch`: та же граница, что у HTTP-клиента. */
function fakeAdapter(source: Backend | (() => Backend) = {}): ApiTransport {
  return {
    get: async (path) => {
      const {
        run = makeReviewRun(),
        files = [api, util],
        findings = [leak, removed, general],
        actions = [],
      } = typeof source === 'function' ? source() : source
      if (path !== mockReviewPath(run.id)) throw new ApiError(404, path)
      return {
        run,
        files: files.map((file) => makeFileSummary({ path: file.path, is_binary: file.is_binary })),
        diffs_by_path: Object.fromEntries(files.map((file) => [file.path, file])),
        findings,
        published_comments: [makePublishedComment({ finding_id: 'leak' })],
        actions,
      }
    },
  }
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
    useRunInspector.setState(initialRunInspectorState)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('пока adapter не ответил, экран говорит, что идёт загрузка', () => {
    renderView({ get: () => new Promise(() => {}) })

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем прогон')
  })

  it('запрашивает прогон по id из адреса', async () => {
    const paths: string[] = []
    const adapter = fakeAdapter({ run: makeReviewRun({ id: 'a1b2-c3' }) })
    renderView(
      {
        get: (path) => {
          paths.push(path)
          return adapter.get(path)
        },
      },
      'a1b2-c3',
    )

    expect(await screen.findByText('Прогон ревью')).toBeInTheDocument()
    expect(paths).toEqual(['/mock-review/a1b2-c3'])
  })

  it('неизвестный id — «Прогон не найден», без повтора', async () => {
    renderView(fakeAdapter(), 'nope')

    expect(await screen.findByRole('alert')).toHaveTextContent('Прогон не найден')
    expect(screen.queryByRole('button', { name: 'Повторить' })).not.toBeInTheDocument()
  })

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
    const change_request = { provider: 'git', url: 'https://git.example.com/acme/api/42' }
    renderView(fakeAdapter({ run: makeReviewRun({ change_request }) }))

    expect(await screen.findByRole('heading', { name: 'Прогон ревью' })).toBeInTheDocument()
    expect(screen.getByText('Завершён')).toBeInTheDocument()
    expect(screen.getByText('Чтение токена из окружения')).toBeInTheDocument()
    expect(screen.getByText('a.petrova')).toBeInTheDocument()
    expect(screen.getByText('feat/env-token → develop')).toBeInTheDocument()
    expect(screen.getByLabelText('Вердикт: Нужны правки')).toHaveTextContent('Оценка 42/100')
    expect(screen.getByRole('link', { name: /Открыть источник/ })).toHaveAttribute(
      'href',
      change_request.url,
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

  it('свёрнутый блок между удалёнными строками тоже можно раскрыть', async () => {
    const user = userEvent.setup()
    const removals = makeDiffFile({
      path: 'app/legacy.py',
      hunks: [hunk(1, 1, ['-import os', '~def unused():', '~    pass', '-print(os.name)'])],
    })
    renderView(fakeAdapter({ files: [removals], findings: [] }))

    await user.click(await screen.findByRole('button', { name: /Показать 2 скрытых строк$/ }))

    await waitFor(() => expect(changesText()).toContain('def unused'))
  })

  it('фильтр по severity прячет остальные замечания в диффе', async () => {
    const user = userEvent.setup()
    renderView(fakeAdapter())

    await screen.findByRole('article', { name: /Токен печатается/ })
    await user.click(screen.getByRole('button', { name: /^High · 1$/ }))

    expect(screen.queryByRole('article', { name: /Токен печатается/ })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: /Секрет был в истории git/ })).toBeInTheDocument()
  })

  it('RunInspector показывает действия по position и детали выбранного', async () => {
    const user = userEvent.setup()
    const actions = [
      makeAction({ id: 'b', position: 2, tool: 'call_llm', response_preview: { findings: 3 } }),
      makeAction({ id: 'a', position: 1, tool: 'get_diff' }),
      makeAction({
        id: 'c',
        position: 3,
        tool: 'unknown_tool',
        status: 'failed',
        error: { code: 'X', message: 'сбой' },
      }),
    ]
    renderView(fakeAdapter({ actions }))

    const tree = await screen.findByRole('list', { name: 'Действия прогона' })
    const tools = within(tree)
      .getAllByRole('button')
      .map((button) => button.textContent)
    expect(tools[0]).toContain('get_diff')
    expect(tools[1]).toContain('call_llm')
    expect(tools[2]).toContain('unknown_tool')

    await user.click(within(tree).getByRole('button', { name: /call_llm/ }))
    const details = screen.getByRole('region', { name: 'Действие call_llm' })
    expect(details).toHaveTextContent('"findings": 3')
    expect(within(details).getAllByText('нет preview')).toHaveLength(1)
  })

  it('INT-02: идущий прогон показан идущим, вердикта ещё нет', async () => {
    renderView(
      fakeAdapter({ run: makeReviewRun({ status: 'analysing', verdict: null, score: null }) }),
    )

    expect(await screen.findByText('Анализ')).toBeInTheDocument()
    expect(screen.getByText('Вердикт появится после завершения')).toBeInTheDocument()
  })

  it('INT-03: упавший прогон показывает причину и не выдаёт результат за полный', async () => {
    const run = makeReviewRun({
      status: 'failed',
      failure_reason: 'LLM не ответила за отведённое время',
      verdict: null,
      score: null,
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
    renderView({ get: async () => ({ run: { id: 'run-1' } }) })

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
    renderView(
      fakeAdapter({ run: makeReviewRun({ status: 'cancelled', verdict: null, score: null }) }),
    )

    // «Отменён» — и значок статуса, и подпись прогресса.
    expect(await screen.findAllByText('Отменён')).toHaveLength(2)
    expect(screen.getByText('Вердикта нет')).toBeInTheDocument()
    expect(screen.getByText(/список замечаний может быть неполным/)).toBeInTheDocument()
  })

  it('INT-08: незнакомый статус не роняет экран и показан идущим', async () => {
    renderView(fakeAdapter({ run: makeReviewRun({ status: 'waiting_for_quota', verdict: null }) }))

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
      renderView(
        fakeAdapter({ run: makeReviewRun({ status: 'analysing', verdict: null, score: null }) }),
      )
      await screen.findByText('Анализ')

      act(() => stream.emitStatus({ status: 'publishing' }))

      await waitFor(() =>
        expect(within(progress()).getByText('Публикация')).toHaveTextContent('выполняется'),
      )
      expect(within(progress()).getByText('Анализ LLM')).toHaveTextContent('завершён')
    })

    it('INT-10: прогон доходит до completed, замечания и вердикт появляются сами', async () => {
      let backend: Backend = {
        run: makeReviewRun({ status: 'analysing', verdict: null, score: null }),
        findings: [],
      }
      renderView(fakeAdapter(() => backend))
      expect(await screen.findByText(/Ревью ещё идёт/)).toBeInTheDocument()
      expect(screen.queryByRole('article', { name: /Токен печатается/ })).not.toBeInTheDocument()

      // К завершению сервер отдаёт замечания и вердикт; событие только сообщает о статусе.
      backend = { run: makeReviewRun({ status: 'completed' }) }
      act(() => stream.emitStatus({ status: 'completed' }))

      expect(await screen.findByRole('article', { name: /Токен печатается/ })).toBeInTheDocument()
      expect(screen.getByLabelText('Вердикт: Нужны правки')).toBeInTheDocument()
      expect(within(progress()).getByText('Публикация')).toHaveTextContent('завершён')
      expect(stream.active()).toBe(0)
    })

    it('INT-11: сбой по событию показывает этап и причину', async () => {
      let backend: Backend = {
        run: makeReviewRun({ status: 'analysing', verdict: null, score: null }),
      }
      renderView(fakeAdapter(() => backend))
      await screen.findByText('Анализ')

      backend = {
        run: makeReviewRun({
          status: 'failed',
          failed_stage: 'analysing',
          failure_reason: 'LLM не ответила',
          verdict: null,
          score: null,
        }),
      }
      act(() =>
        stream.emitStatus({
          status: 'failed',
          failed_stage: 'analysing',
          failure_reason: 'LLM не ответила',
        }),
      )

      expect(await screen.findByText('Ошибка')).toBeInTheDocument()
      expect(within(progress()).getByText('Анализ LLM')).toHaveTextContent('ошибка')
      expect(within(progress()).getByText('LLM не ответила')).toBeInTheDocument()
    })

    it('INT-12: отказ сервера в подписке не прячет прогон, а «Обновить» открывает поток заново', async () => {
      const user = userEvent.setup()
      renderView(fakeAdapter({ run: makeReviewRun({ status: 'analysing', verdict: null }) }))
      await screen.findByText('Анализ')

      act(() => stream.setState('failed'))
      expect(await screen.findByText('Не удалось получить обновления статуса')).toBeInTheDocument()
      expect(screen.getByText('Анализ')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Обновить' }))

      await waitFor(() => expect(stream.opened).toHaveLength(2))
    })

    it('INT-20: идущий прогон без событий не опрашивается по таймеру', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const inner = fakeAdapter({
        run: makeReviewRun({ status: 'analysing', verdict: null, score: null }),
      })
      const get = vi.fn(inner.get)
      renderView({ get })
      await screen.findByText('Анализ')

      await act(() => vi.advanceTimersByTimeAsync(10 * 60 * 1000))

      expect(get).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Анализ')).toBeInTheDocument()
    })

    it('INT-21: при обрыве соединения замечания и данные прогона остаются на экране', async () => {
      renderView(
        fakeAdapter({ run: makeReviewRun({ status: 'analysing', verdict: null, score: null }) }),
      )
      await screen.findByRole('article', { name: /Токен печатается/ })

      act(() => stream.emitStatus({ status: 'publishing' }))
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
        fakeAdapter(() => {
          responses += 1
          return responses === 1
            ? { files, findings, run: makeReviewRun({ status: 'analysing', verdict: null }) }
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
