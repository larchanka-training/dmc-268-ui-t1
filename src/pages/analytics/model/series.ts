import { CATEGORY_LABEL, type Severity } from '@/entities/review-finding'

import type { FindingsDayCount } from '@/entities/analytics'

const DAY_MS = 86_400_000

/** UTC-дни периода `[from, to)` в виде `YYYY-MM-DD`; крайние дни неполные, но входят целиком. */
export function utcDays(createdFrom: string, createdTo: string): string[] {
  const first = Math.floor(Date.parse(createdFrom) / DAY_MS)
  // `created_to` исключительно: полночь не открывает нового дня.
  const last = Math.floor((Date.parse(createdTo) - 1) / DAY_MS)
  const days: string[] = []
  for (let day = first; day <= last; day += 1) {
    days.push(new Date(day * DAY_MS).toISOString().slice(0, 10))
  }
  return days
}

export type FindingsPoint = { date: string; category: string; count: number }

/**
 * Точки столбчатой диаграммы: день × категория, дни без замечаний — нулями (бэкенд их не
 * отдаёт). `severity` — необязательный фильтр по важности.
 */
export function findingsSeries(
  rows: FindingsDayCount[],
  days: string[],
  severity: Severity | null,
): FindingsPoint[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (severity && row.severity !== severity) continue
    const key = `${row.date}|${row.category}`
    counts.set(key, (counts.get(key) ?? 0) + row.count)
  }
  return days.flatMap((date) =>
    (Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((category) => ({
      date,
      category: CATEGORY_LABEL[category],
      count: counts.get(`${date}|${category}`) ?? 0,
    })),
  )
}
