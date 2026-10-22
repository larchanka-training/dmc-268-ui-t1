import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { parsePage, useUrlPagination, type UrlPaginationOptions } from './urlPagination'

function renderAt(url: string, options: UrlPaginationOptions) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  )
  return renderHook(() => useUrlPagination(options), { wrapper }).result.current
}

describe('parsePage', () => {
  it('принимает целое число с единицы', () => {
    expect(parsePage('1')).toBe(1)
    expect(parsePage('42')).toBe(42)
  })

  it.each([null, '', 'abc', '0', '-1', '1.5', '2e1', ' 2', '02', '99999999999999999999'])(
    '%j — не номер страницы',
    (raw) => {
      expect(parsePage(raw)).toBeUndefined()
    },
  )
})

describe('useUrlPagination', () => {
  it('берёт страницу из `page` и считает offset', () => {
    const p = renderAt('/list?page=3', { pageSize: 10, total: 45 })

    expect(p).toMatchObject({ page: 3, pageSize: 10, offset: 20, pageCount: 5 })
  })

  it.each(['/list', '/list?page=abc', '/list?page=0', '/list?page=-1'])(
    '%s — первая страница',
    (url) => {
      expect(renderAt(url, { pageSize: 10, total: 45 }).page).toBe(1)
    },
  )

  it('страница больше числа страниц — последняя', () => {
    expect(renderAt('/list?page=9', { pageSize: 10, total: 45 }).page).toBe(5)
    expect(renderAt('/list?page=9', { pageSize: 10, total: 0 }).page).toBe(1)
  })

  it('пока total неизвестен, страница из URL не ограничивается — для серверной пагинации', () => {
    const p = renderAt('/list?page=9', { pageSize: 20 })

    expect(p).toMatchObject({ page: 9, offset: 160, pageCount: undefined })
  })

  it('ссылка на страницу сохраняет прочие параметры, первая — без `page`', () => {
    const p = renderAt('/list?q=front&page=2&sort=name', { pageSize: 10, total: 45 })

    expect(p.toPage(3)).toBe('/list?q=front&page=3&sort=name')
    expect(p.toPage(1)).toBe('/list?q=front&sort=name')
    expect(renderAt('/list?page=2', { pageSize: 10 }).toPage(1)).toBe('/list')
  })
})
