/** Пресеты периода в днях; бэкенд принимает не больше 180. */
export const PERIOD_PRESETS = [7, 30, 90, 180] as const

export type PeriodDays = (typeof PERIOD_PRESETS)[number]

export const DEFAULT_PERIOD_DAYS: PeriodDays = 30

const DAY_MS = 86_400_000

/**
 * Границы периода «последние N дней». Передаются обе: без `created_to` бэкенд берёт конец по
 * своим часам, и ровно 180 дней превращаются в 422.
 */
export function periodBounds(days: PeriodDays, nowMs: number) {
  return {
    createdFrom: new Date(nowMs - days * DAY_MS).toISOString(),
    createdTo: new Date(nowMs).toISOString(),
  }
}

/** Query-параметры страницы: период и репозиторий живут в URL, важность — локально. */
export const ANALYTICS_PARAMS = { days: 'days', repository: 'repository_id' } as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Период и репозиторий из URL; всё, что не пресет и не uuid, — «по умолчанию». */
export function parseAnalyticsParams(params: URLSearchParams): {
  days: PeriodDays
  repositoryId: string | null
} {
  const days = PERIOD_PRESETS.find((value) => String(value) === params.get(ANALYTICS_PARAMS.days))
  const repository = params.get(ANALYTICS_PARAMS.repository)
  return {
    days: days ?? DEFAULT_PERIOD_DAYS,
    repositoryId: repository !== null && UUID.test(repository) ? repository : null,
  }
}

/** Те же параметры в канонической записи: значения по умолчанию не пишутся, прочие параметры остаются. */
export function writeAnalyticsParams(
  params: URLSearchParams,
  { days, repositoryId }: { days: PeriodDays; repositoryId: string | null },
): URLSearchParams {
  const next = new URLSearchParams(params)
  if (days === DEFAULT_PERIOD_DAYS) next.delete(ANALYTICS_PARAMS.days)
  else next.set(ANALYTICS_PARAMS.days, String(days))
  if (repositoryId === null) next.delete(ANALYTICS_PARAMS.repository)
  else next.set(ANALYTICS_PARAMS.repository, repositoryId)
  return next
}
