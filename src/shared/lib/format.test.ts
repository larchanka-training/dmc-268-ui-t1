import { describe, expect, it } from 'vitest'

import { formatDateTime, formatDuration, formatEuro, safeExternalUrl, shortSha } from './format'

describe('formatDuration', () => {
  it.each([
    [0, '0 с'],
    [42, '42 с'],
    [60, '1 мин'],
    [134, '2 мин 14 с'],
    [59.6, '1 мин'],
  ])('%s секунд → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })
})

describe('formatDateTime', () => {
  it('показывает время в UTC', () => {
    expect(formatDateTime('2026-09-20T14:05:00Z')).toBe('20.09.2026, 14:05 UTC')
  })

  it('возвращает строку как есть, если это не дата', () => {
    expect(formatDateTime('вчера')).toBe('вчера')
  })
})

describe('shortSha', () => {
  it('оставляет семь символов', () => {
    expect(shortSha('4f2a9c1e8b7d6a5f')).toBe('4f2a9c1')
  })
})

describe('safeExternalUrl', () => {
  it('пропускает http и https', () => {
    expect(safeExternalUrl('https://git.example.com/mr/1')).toBe('https://git.example.com/mr/1')
  })

  it.each(['javascript:alert(1)', 'data:text/html,x', 'не адрес'])('отбрасывает %s', (url) => {
    expect(safeExternalUrl(url)).toBeNull()
  })
})

describe('formatEuro', () => {
  it.each([
    ['4.75', '4,75 €'],
    ['0', '0,00 €'],
    ['-0.01', '-0,01 €'],
    ['-12.5', '-12,50 €'],
    ['1234567.89', '1 234 567,89 €'],
    // Через Number здесь потерялся бы последний знак: 17 значащих цифр больше точности double.
    ['1234567890.0000000001', '1 234 567 890,0000000001 €'],
    ['0.0001234567', '0,0001234567 €'],
  ])('%s → %s', (amount, expected) => {
    // Intl ставит неразрывные пробелы: сравниваем с обычными.
    expect(formatEuro(amount).replace(/\s/g, ' ')).toBe(expected)
  })

  it('не число показывает как есть', () => {
    expect(formatEuro('abc')).toBe('abc €')
  })
})
