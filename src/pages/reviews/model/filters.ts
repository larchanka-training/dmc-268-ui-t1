import { isKnownStatus, type KnownRunStatus, type ReviewRunListQuery } from '@/entities/review-run'
import { PAGE_PARAM } from '@/shared/lib'

/**
 * Query-параметры вкладки «Ревью». Источник правды для поиска, фильтров, страницы и размера —
 * URL: ссылку можно отправить, «назад» возвращает прежнее состояние. Некорректное значение
 * параметра — значение по умолчанию, страница не падает.
 */
export const FILTER_PARAMS = {
  q: 'q',
  author: 'author',
  active: 'active',
  status: 'status',
  repository: 'repository_id',
  from: 'from',
  to: 'to',
  pageSize: 'page_size',
} as const

export const PAGE_SIZES = [10, 20, 50] as const
export const DEFAULT_PAGE_SIZE = 20

/** Лимиты контракта `GET /reviews`. */
const MAX_REPOSITORIES = 50
const MAX_Q = 200
const MAX_AUTHOR = 255

export type ActivityFilter = 'active' | 'finished' | 'all'

export type ReviewListFilters = {
  q: string
  author: string
  activity: ActivityFilter
  statuses: KnownRunStatus[]
  repositoryIds: string[]
  /** День начала периода `YYYY-MM-DD` (UTC), включительно. */
  from: string | null
  /** День конца периода `YYYY-MM-DD` (UTC), включительно. */
  to: string | null
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** День в формате `YYYY-MM-DD`, который действительно существует; иначе `null`. */
function parseDay(raw: string | null): string | null {
  if (raw === null || !DAY.test(raw)) return null
  const date = new Date(`${raw}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(raw) ? raw : null
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function parseActivity(raw: string | null): ActivityFilter {
  if (raw === 'true') return 'active'
  if (raw === 'false') return 'finished'
  return 'all'
}

function parseText(raw: string | null, max: number): string {
  const value = (raw ?? '').trim()
  return value.length <= max ? value : ''
}

export function parseFilters(params: URLSearchParams): ReviewListFilters {
  const from = parseDay(params.get(FILTER_PARAMS.from))
  const to = parseDay(params.get(FILTER_PARAMS.to))
  // Начало позже конца бэкенд отклоняет (`422`); такой период считаем незаданным.
  const validPeriod = from === null || to === null || from <= to
  return {
    q: parseText(params.get(FILTER_PARAMS.q), MAX_Q),
    author: parseText(params.get(FILTER_PARAMS.author), MAX_AUTHOR),
    activity: parseActivity(params.get(FILTER_PARAMS.active)),
    statuses: unique(params.getAll(FILTER_PARAMS.status)).filter(isKnownStatus),
    repositoryIds: unique(params.getAll(FILTER_PARAMS.repository).filter(Boolean)).slice(
      0,
      MAX_REPOSITORIES,
    ),
    from: validPeriod ? from : null,
    to: validPeriod ? to : null,
  }
}

export function parsePageSize(raw: string | null): number {
  const size = Number(raw)
  return (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE
}

/** Хоть один фильтр или поиск задан: поток событий их не учитывает, страницу надо перезапрашивать. */
export function hasActiveFilters(filters: ReviewListFilters): boolean {
  return (
    filters.q !== '' ||
    filters.author !== '' ||
    filters.activity !== 'all' ||
    filters.statuses.length > 0 ||
    filters.repositoryIds.length > 0 ||
    filters.from !== null ||
    filters.to !== null
  )
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

/** Параметры запроса `GET /reviews`. Период — по дням UTC, как время на экране; конец включительно. */
export function toListQuery(
  filters: ReviewListFilters,
  { limit, offset }: { limit: number; offset: number },
): ReviewRunListQuery {
  return {
    q: filters.q || undefined,
    author: filters.author || undefined,
    active: filters.activity === 'all' ? undefined : filters.activity === 'active',
    status: filters.statuses.length > 0 ? filters.statuses : undefined,
    repository_id: filters.repositoryIds.length > 0 ? filters.repositoryIds : undefined,
    created_from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
    created_to: filters.to ? nextDay(filters.to) : undefined,
    limit,
    offset,
  }
}

/**
 * Записывает изменённые фильтры в query-параметры. Остальные параметры сохраняются, страница
 * сбрасывается на первую: при новых фильтрах прежний номер страницы ничего не значит.
 */
export function writeFilters(
  params: URLSearchParams,
  patch: Partial<ReviewListFilters>,
): URLSearchParams {
  const next = new URLSearchParams(params)
  const set = (name: string, values: readonly string[]) => {
    next.delete(name)
    for (const value of values) if (value) next.append(name, value)
  }
  if (patch.q !== undefined) set(FILTER_PARAMS.q, [patch.q.trim()])
  if (patch.author !== undefined) set(FILTER_PARAMS.author, [patch.author.trim()])
  if (patch.activity !== undefined) {
    const value = { active: 'true', finished: 'false', all: '' }[patch.activity]
    set(FILTER_PARAMS.active, [value])
  }
  if (patch.statuses !== undefined) set(FILTER_PARAMS.status, patch.statuses)
  if (patch.repositoryIds !== undefined) set(FILTER_PARAMS.repository, patch.repositoryIds)
  if (patch.from !== undefined) set(FILTER_PARAMS.from, [patch.from ?? ''])
  if (patch.to !== undefined) set(FILTER_PARAMS.to, [patch.to ?? ''])
  next.delete(PAGE_PARAM)
  return next
}
