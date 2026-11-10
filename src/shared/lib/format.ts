const dateTimeFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

/** Дата и время в UTC: время прогона одинаково читается у всех участников ревью. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : `${dateTimeFormat.format(date)} UTC`
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  if (minutes === 0) return `${rest} с`
  return rest === 0 ? `${minutes} мин` : `${minutes} мин ${rest} с`
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU')
}

const euroFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  // У бэкенда деньги — Numeric(20, 10): десять знаков после запятой хватает на любую сумму.
  maximumFractionDigits: 10,
})

const DECIMAL = /^-?\d+(\.\d+)?$/

/**
 * Сумма в евро из десятичной строки API (`"4.75"`, `"-0.01"`). Строка уходит в `Intl` как есть,
 * без `Number`: в числе с плавающей точкой копейки больших сумм теряются. Не число — как есть.
 */
export function formatEuro(amount: string): string {
  return DECIMAL.test(amount) ? euroFormat.format(amount as `${number}`) : `${amount} €`
}

/** Внешняя ссылка из API допустима только по http(s): `javascript:` и прочие схемы отбрасываются. */
export function safeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null
  } catch {
    return null
  }
}
