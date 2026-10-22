import {
  isTerminalStatus,
  KNOWN_STATUSES,
  type ReviewRunListItem,
  type ReviewRunListPage,
  type RunTrigger,
} from '../../entities/review-run'
import { ApiError } from '../../shared/api'
import { mockReview } from './fixtures'
import type { MockServer } from './mockServer'
import { mockRepositoryId } from './repositories'

/** Чужой прогон в общем потоке: его события экран прогона `run-42` должен пропускать. */
export const FOREIGN_RUN_ID = 'run-7'

/** Запрос на изменение чужого прогона: свой PR в другом репозитории, на полчаса раньше. */
const FOREIGN = {
  created_at: new Date(Date.parse(mockReview.created_at) - 30 * 60 * 1000).toISOString(),
  merge_request: {
    id: 'mr-docs-17',
    number: 17,
    title: 'Раздел о потоке событий кабинета',
    author: 'i.sidorov',
    source_branch: 'docs/events-stream',
    target_branch: 'main',
    state: 'open',
    url: 'https://github.com/larchanka-training/docs/pull/17',
    repository: {
      id: mockRepositoryId(2),
      provider: 'github',
      full_name: 'larchanka-training/docs',
    },
  },
} satisfies Pick<ReviewRunListItem, 'created_at' | 'merge_request'>

/**
 * Строка списка прогона `id` на шаге сценария `index`: такие же данные приходят событием `run.*`.
 * `updated_at` меняется ровно на переходах сценария, поэтому событие и снимок сравнимы.
 */
export function scenarioRow(server: MockServer, index: number, id: string): ReviewRunListItem {
  const step = server.scenario[index]
  const at = new Date(server.enteredAt(index)).toISOString()
  const own = id !== FOREIGN_RUN_ID
  return {
    id,
    status: step.status,
    trigger: mockReview.trigger,
    head_sha: mockReview.head_sha,
    created_at: own ? mockReview.created_at : FOREIGN.created_at,
    updated_at: at,
    last_progress_at: at,
    duration_seconds: isTerminalStatus(step.status) ? mockReview.duration_seconds : null,
    failed_stage: step.failed_stage ?? null,
    findings_count: step.status === 'completed' ? mockReview.findings.length : 0,
    merge_request: own ? mockReview.merge_request : FOREIGN.merge_request,
  }
}

const REPOSITORIES = [
  { id: mockRepositoryId(1), provider: 'github', full_name: 'larchanka-training/platform-api' },
  { id: mockRepositoryId(2), provider: 'github', full_name: 'larchanka-training/docs' },
] as const

const AUTHORS = ['a.petrova', 'i.sidorov', 'm.kuznetsova', 'd.orlov']
const TITLES = [
  'Повтор запросов к БД при обрыве соединения',
  'Кэш списка репозиториев',
  'Валидация вебхука GitHub',
  'Раздел о развёртывании стенда',
  'Миграция таблицы прогонов',
  'Таймаут запроса к модели',
  'Логи с идентификатором трассы',
]
const TRIGGERS: RunTrigger[] = ['webhook', 'webhook', 'manual', 'mention']

/** Время первого (самого нового) сгенерированного прогона: на час раньше прогона из фикстуры. */
const NEWEST = Date.parse(mockReview.created_at) - 60 * 60 * 1000

/** Двадцать восемь завершённых и идущих прогонов: несколько страниц, оба репозитория, все статусы. */
function generatedRuns(): ReviewRunListItem[] {
  return Array.from({ length: 28 }, (_, n) => {
    const status = KNOWN_STATUSES[n % KNOWN_STATUSES.length]
    const repository = REPOSITORIES[n % REPOSITORIES.length]
    const number = 41 - n
    const created = new Date(NEWEST - n * 3 * 60 * 60 * 1000)
    const updated = new Date(created.getTime() + 2 * 60 * 1000).toISOString()
    const terminal = isTerminalStatus(status)
    return {
      id: `run-${100 + n}`,
      status,
      trigger: TRIGGERS[n % TRIGGERS.length],
      head_sha: `${(0x9f3c2a17 + n).toString(16)}e4b8d6c0a5f1`,
      created_at: created.toISOString(),
      updated_at: updated,
      last_progress_at: updated,
      duration_seconds: terminal ? 60 + n * 7 : null,
      failed_stage: status === 'failed' ? 'analysing' : null,
      findings_count: status === 'completed' ? n % 6 : 0,
      merge_request: {
        id: `mr-${number}`,
        number,
        title: TITLES[n % TITLES.length],
        author: AUTHORS[n % AUTHORS.length],
        source_branch: `feat/task-${number}`,
        target_branch: 'develop',
        state: terminal ? 'merged' : 'open',
        url: `https://github.com/${repository.full_name}/pull/${number}`,
        repository: { ...repository },
      },
    }
  })
}

/** Прогон из фикстуры строкой списка: без сервера — завершённый. */
function fixtureRow(): ReviewRunListItem {
  return {
    id: mockReview.id,
    status: mockReview.status,
    trigger: mockReview.trigger,
    head_sha: mockReview.head_sha,
    created_at: mockReview.created_at,
    updated_at: mockReview.updated_at,
    last_progress_at: mockReview.last_progress_at,
    duration_seconds: mockReview.duration_seconds,
    failed_stage: mockReview.failed_stage,
    findings_count: mockReview.findings.length,
    merge_request: mockReview.merge_request,
  }
}

/**
 * Чужой прогон идёт на полшага позади своего: поток шлёт его событие посреди каждого шага.
 * До первой середины он в первом статусе сценария.
 */
function foreignRow(server: MockServer): ReviewRunListItem {
  const index = server.currentIndex()
  const pastMiddle = Date.now() >= server.enteredAt(index) + server.stepMs / 2
  const step = index < server.scenario.length - 1 && pastMiddle ? index + 1 : index
  return scenarioRow(server, step, FOREIGN_RUN_ID)
}

function byNewest(a: ReviewRunListItem, b: ReviewRunListItem): number {
  const byCreated = Date.parse(b.created_at) - Date.parse(a.created_at)
  if (byCreated !== 0) return byCreated
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}

function matchesQuery(run: ReviewRunListItem, q: string): boolean {
  const mr = run.merge_request
  const number = q.startsWith('#') ? q.slice(1) : q
  if (/^\d+$/.test(number) && Number(number) === mr.number) return true
  const needle = q.toLowerCase()
  return [mr.title, mr.author, mr.source_branch].some((field) =>
    field.toLowerCase().includes(needle),
  )
}

function intParam(params: URLSearchParams, name: string, fallback: number): number {
  const raw = params.get(name)
  return raw !== null && /^\d+$/.test(raw) ? Number(raw) : fallback
}

/**
 * Список прогонов `GET /reviews` mock adapter: фильтры, порядок и постраничность — как описано
 * в контракте у `listReviews`. С `server` прогон фикстуры и чужой прогон идут по сценарию, как
 * в mock-потоке, и снимок сходится с событиями.
 */
export function createReviewRunStore(server?: MockServer) {
  const generated = generatedRuns()

  const all = (): ReviewRunListItem[] => {
    if (!server) return [fixtureRow(), ...generated]
    return [
      scenarioRow(server, server.currentIndex(), mockReview.id),
      foreignRow(server),
      ...generated,
    ]
  }

  return {
    list(search: string): ReviewRunListPage {
      const params = new URLSearchParams(search)
      const statuses = params.getAll('status')
      const repositories = params.getAll('repository_id')
      const active = params.get('active')
      const author = params.get('author') ?? ''
      const q = (params.get('q') ?? '').trim()
      const from = params.get('created_from')
      const to = params.get('created_to')
      if (from && to && Date.parse(from) > Date.parse(to)) {
        throw new ApiError(422, 'created_from позже created_to', 'VALIDATION_ERROR')
      }

      const matching = all()
        .filter((run) => statuses.length === 0 || statuses.includes(run.status))
        .filter((run) => active === null || isTerminalStatus(run.status) !== (active === 'true'))
        .filter(
          (run) =>
            repositories.length === 0 || repositories.includes(run.merge_request.repository.id),
        )
        .filter((run) => author === '' || run.merge_request.author === author)
        .filter((run) => q === '' || matchesQuery(run, q))
        .filter((run) => !from || Date.parse(run.created_at) >= Date.parse(from))
        .filter((run) => !to || Date.parse(run.created_at) < Date.parse(to))
        .sort(byNewest)

      const limit = Math.min(Math.max(intParam(params, 'limit', 50), 1), 200)
      const offset = intParam(params, 'offset', 0)
      return { items: matching.slice(offset, offset + limit), total: matching.length }
    },
  }
}
