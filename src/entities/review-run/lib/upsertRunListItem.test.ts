import { describe, expect, it } from 'vitest'

import { makeRunListItem } from '../../../test/factories'
import { mergeRunListSnapshot, upsertRunListItem } from './upsertRunListItem'

const row = (id: string, created: string, updated = created) =>
  makeRunListItem({ id, created_at: created, updated_at: updated, status: 'analysing' })

const page = {
  items: [row('run-3', '2026-09-20T12:00:00Z'), row('run-2', '2026-09-20T11:00:00Z')],
  total: 5,
}

describe('upsertRunListItem', () => {
  it('новый прогон встаёт сверху, total растёт', () => {
    const created = row('run-4', '2026-09-20T13:00:00Z')
    const next = upsertRunListItem(page, created, 10)
    expect(next.items.map((item) => item.id)).toEqual(['run-4', 'run-3', 'run-2'])
    expect(next.total).toBe(6)
  })

  it('на полной странице последняя строка уходит на следующую', () => {
    const next = upsertRunListItem(page, row('run-4', '2026-09-20T13:00:00Z'), 2)
    expect(next.items.map((item) => item.id)).toEqual(['run-4', 'run-3'])
  })

  it('заменяет строку, если событие новее', () => {
    const event = {
      ...row('run-2', '2026-09-20T11:00:00Z', '2026-09-20T11:05:00Z'),
      status: 'publishing',
    }
    const next = upsertRunListItem(page, event, 10)
    expect(next.items[1].status).toBe('publishing')
    expect(next.total).toBe(5)
  })

  it('событие старше строки не меняет страницу', () => {
    const current = {
      items: [row('run-2', '2026-09-20T11:00:00Z', '2026-09-20T11:10:00Z')],
      total: 1,
    }
    const stale = {
      ...row('run-2', '2026-09-20T11:00:00Z', '2026-09-20T11:05:00Z'),
      status: 'queued',
    }
    expect(upsertRunListItem(current, stale, 10)).toBe(current)
  })

  it('прогон ниже полной страницы её не меняет', () => {
    const old = row('run-1', '2026-09-20T10:00:00Z')
    expect(upsertRunListItem(page, old, 2)).toBe(page)
  })

  it('при равном created_at выше строка с большим id', () => {
    const next = upsertRunListItem(page, row('run-9', '2026-09-20T12:00:00Z'), 10)
    expect(next.items.map((item) => item.id)).toEqual(['run-9', 'run-3', 'run-2'])
  })
})

describe('mergeRunListSnapshot', () => {
  const snapshot = {
    items: [row('run-3', '2026-09-20T12:00:00Z'), row('run-2', '2026-09-20T11:00:00Z')],
    total: 2,
  }

  it('без кэша — снимок как есть', () => {
    expect(mergeRunListSnapshot(undefined, snapshot)).toBe(snapshot)
  })

  it('строка кэша новее по updated_at побеждает строку снимка, состав и total — из снимка', () => {
    const newer = {
      ...row('run-2', '2026-09-20T11:00:00Z', '2026-09-20T11:00:00.000001Z'),
      status: 'publishing',
    }
    const cached = { items: [row('run-9', '2026-09-20T13:00:00Z'), newer], total: 7 }
    const merged = mergeRunListSnapshot(cached, snapshot)
    expect(merged.items.map((item) => [item.id, item.status])).toEqual([
      ['run-3', 'analysing'],
      ['run-2', 'publishing'],
    ])
    expect(merged.total).toBe(2)
  })

  it('при равном updated_at побеждает снимок', () => {
    const cached = { items: [{ ...snapshot.items[1], status: 'queued' }], total: 1 }
    expect(mergeRunListSnapshot(cached, snapshot)).toBe(snapshot)
  })
})
