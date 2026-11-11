import { describe, expect, it } from 'vitest'

import { findingsSeries, utcDays } from './series'

describe('utcDays', () => {
  it('крайние дни входят целиком, полночь конца нового дня не открывает', () => {
    expect(utcDays('2026-11-08T15:30:00Z', '2026-11-11T00:00:00Z')).toEqual([
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
    ])
  })

  it('конец посреди дня — этот день последний', () => {
    expect(utcDays('2026-11-10T00:00:00Z', '2026-11-11T09:00:00Z')).toEqual([
      '2026-11-10',
      '2026-11-11',
    ])
  })
})

describe('findingsSeries', () => {
  const rows = [
    { date: '2026-11-09', category: 'security', severity: 'high', count: 2 },
    { date: '2026-11-09', category: 'security', severity: 'low', count: 1 },
    { date: '2026-11-09', category: 'readability', severity: 'low', count: 4 },
  ] as const
  const days = ['2026-11-08', '2026-11-09']

  it('достраивает нули и суммирует важности одной категории', () => {
    const points = findingsSeries([...rows], days, null)

    expect(points).toHaveLength(8)
    expect(points.filter((p) => p.date === '2026-11-08').every((p) => p.count === 0)).toBe(true)
    expect(
      points.find((p) => p.date === '2026-11-09' && p.category === 'Безопасность')?.count,
    ).toBe(3)
  })

  it('фильтр по важности отсекает остальные', () => {
    const points = findingsSeries([...rows], days, 'high')

    expect(points.reduce((sum, p) => sum + p.count, 0)).toBe(2)
  })
})
