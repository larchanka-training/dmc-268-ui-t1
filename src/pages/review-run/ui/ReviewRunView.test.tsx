import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import type { DiffFile } from '../../../entities/diff'
import type { ReviewFinding } from '../../../entities/review-finding'
import type { ReviewRun } from '../../../entities/review-run'
import type { ReviewRunAction } from '../../../entities/review-run-action'
import { initialFilterFindingsState, useFilterFindings } from '../../../features/filter-findings'
import { ApiError, type ApiTransport } from '../../../shared/api'
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
import { MOCK_REVIEW_PATH } from '../model/mockReview'
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
function fakeAdapter({
  run = makeReviewRun(),
  files = [api, util],
  findings = [leak, removed, general],
  actions = [],
}: Backend = {}): ApiTransport {
  return {
    get: async (path) => {
      if (path !== MOCK_REVIEW_PATH) throw new ApiError(404, path)
      return {
        run,
        files: files.map((file) => makeFileSummary({ path: file.path })),
        diffs_by_path: Object.fromEntries(files.map((file) => [file.path, file])),
        findings,
        published_comments: [makePublishedComment({ finding_id: 'leak' })],
        actions,
      }
    },
  }
}

/** Текст области изменений: подсветка режет строку кода на отдельные узлы. */
const changesText = () => screen.getByRole('region', { name: 'Изменения' }).textContent ?? ''

function renderView(adapter: ApiTransport) {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false } })
  render(
    <AppProviders transport={adapter} queryClient={queryClient}>
      <ReviewRunView />
    </AppProviders>,
  )
  return { queryClient }
}

describe('ReviewRunView', () => {
  beforeEach(() => {
    useReviewWorkspace.setState(initialReviewWorkspaceState)
    useFilterFindings.setState(initialFilterFindingsState)
    useRunInspector.setState(initialRunInspectorState)
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
      status: 'deleted',
      hunks: [hunk(1, 0, ['-import os', '~def unused():', '~    pass', '-print(os.name)'])],
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

    expect(await screen.findByText('Отменён')).toBeInTheDocument()
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
})
