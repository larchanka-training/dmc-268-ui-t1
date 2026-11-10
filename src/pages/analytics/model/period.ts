/** Пресеты периода в днях; бэкенд принимает не больше 180. */
export const PERIOD_PRESETS = [7, 30, 90, 180] as const

export type PeriodDays = (typeof PERIOD_PRESETS)[number]

export const DEFAULT_PERIOD_DAYS: PeriodDays = 30

const DAY_MS = 86_400_000

/**
 * Границы периода «последние N дней». Передаются обе: без `created_to` бэкенд берёт конец по
 * своим часам, и ровно 180 дней превращаются в 422. Секунды целые, чтобы ключ запроса не плавал.
 */
export function periodBounds(days: PeriodDays, nowMs: number) {
  const to = Math.floor(nowMs / 1000) * 1000
  return {
    createdFrom: new Date(to - days * DAY_MS).toISOString(),
    createdTo: new Date(to).toISOString(),
  }
}
