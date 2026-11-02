import { describe, expect, it } from 'vitest'

import { ApiError, ContractError } from '@/shared/api'

import type { ServiceStatusReport } from '../model/schema'
import { viewFromFailure, viewFromReport, worstStatus } from './view'

const FAILED_AT = Date.parse('2026-11-02T10:00:00Z')

describe('worstStatus', () => {
  it.each([
    [['operational', 'degraded', 'outage'], 'outage'],
    [['operational', 'unknown', 'degraded'], 'degraded'],
    [['operational', 'unknown'], 'unknown'],
    [['operational', 'operational'], 'operational'],
  ] as const)('%j → %s', (statuses, expected) => {
    expect(worstStatus(statuses)).toBe(expected)
  })
})

describe('viewFromReport', () => {
  it('ставит компоненты в порядке api, worker, queue, пропавший — «Нет данных»', () => {
    const report: ServiceStatusReport = {
      status: 'degraded',
      components: [
        { id: 'queue', status: 'operational' },
        { id: 'api', status: 'degraded' },
      ],
      checked_at: '2026-11-02T10:00:00Z',
    }

    expect(viewFromReport(report)).toEqual({
      status: 'degraded',
      components: [
        { id: 'api', status: 'degraded' },
        { id: 'worker', status: 'unknown' },
        { id: 'queue', status: 'operational' },
      ],
      checkedAt: '2026-11-02T10:00:00Z',
    })
  })
})

describe('viewFromFailure', () => {
  it.each([
    ['сбой сети', new TypeError('Failed to fetch')],
    ['502 от nginx', new ApiError(502, 'Запрос /status завершился ошибкой 502')],
    ['500 от API', new ApiError(500, 'Внутренняя ошибка', 'INTERNAL_ERROR')],
  ])('%s: API недоступен, про воркер и очередь — нет данных', (_name, error) => {
    expect(viewFromFailure(error, FAILED_AT)).toEqual({
      status: 'outage',
      components: [
        { id: 'api', status: 'outage' },
        { id: 'worker', status: 'unknown' },
        { id: 'queue', status: 'unknown' },
      ],
      checkedAt: '2026-11-02T10:00:00.000Z',
    })
  })

  it.each([
    ['404 — у бэкенда нет ручки', new ApiError(404, 'Нет ручки', 'ROUTE_NOT_FOUND')],
    ['ответ вне контракта', new ContractError('/status', 'нет checked_at')],
  ])('%s: API отвечает, но состояние неизвестно', (_name, error) => {
    const view = viewFromFailure(error, FAILED_AT)

    expect(view.status).toBe('unknown')
    expect(view.components.map((component) => component.status)).toEqual([
      'unknown',
      'unknown',
      'unknown',
    ])
  })
})
