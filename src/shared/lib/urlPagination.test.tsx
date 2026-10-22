import { describe, expect, it } from 'vitest'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom'
import { PageNav } from '@/shared/ui'
import {
  clampPage,
  pageCountOf,
  pageSlice,
  parsePage,
  useNormalizeUrlPage,
  useUrlPage,
} from './urlPagination'

function renderAt(url: string, pageSize = 10) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  )
  return renderHook(() => useUrlPage({ pageSize }), { wrapper }).result.current
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

describe('чистые функции', () => {
  it('число страниц, ограничение и нарезка', () => {
    expect(pageCountOf(45, 10)).toBe(5)
    expect(pageCountOf(0, 10)).toBe(1)
    expect(clampPage(9, 5)).toBe(5)
    expect(clampPage(9, undefined)).toBe(9)
    expect(pageSlice([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4])
  })
})

describe('useUrlPage', () => {
  it('берёт страницу из `page` и считает offset, сверху не ограничивает', () => {
    expect(renderAt('/list?page=3')).toMatchObject({ page: 3, pageSize: 10, offset: 20 })
    expect(renderAt('/list?page=99', 20)).toMatchObject({ page: 99, offset: 1960 })
  })

  it.each(['/list', '/list?page=abc', '/list?page=0', '/list?page=-1'])(
    '%s — первая страница',
    (url) => {
      expect(renderAt(url)).toMatchObject({ page: 1, offset: 0 })
    },
  )

  it('ссылка на страницу сохраняет прочие параметры, первая — без `page`', () => {
    const p = renderAt('/list?q=front&page=2&sort=name')

    expect(p.toPage(3)).toBe('/list?q=front&page=3&sort=name')
    expect(p.toPage(1)).toBe('/list?q=front&sort=name')
    expect(renderAt('/list?page=2').toPage(1)).toBe('/list')
  })
})

interface Page {
  items: string[]
  total: number
}

/** Список, как будет на /reviews: ключ запроса — только offset, total — из ответа. */
function ServerList({ fetchPage }: { fetchPage: (offset: number) => Promise<Page> }) {
  const urlPage = useUrlPage({ pageSize: 10 })
  const { data } = useQuery({
    queryKey: ['items', urlPage.offset],
    queryFn: () => fetchPage(urlPage.offset),
  })
  const pageCount = data && pageCountOf(data.total, urlPage.pageSize)
  useNormalizeUrlPage(urlPage, pageCount)
  return (
    <>
      {data?.items.map((item) => (
        <p key={item}>{item}</p>
      ))}
      {pageCount !== undefined && (
        <PageNav
          page={clampPage(urlPage.page, pageCount)}
          pageCount={pageCount}
          toPage={urlPage.toPage}
        />
      )}
    </>
  )
}

describe('серверная пагинация limit/offset', () => {
  it('?page=99: запрос с большим offset → total → замена URL на последнюю → второй запрос', async () => {
    const total = 25
    const offsets: number[] = []
    const pending: { offset: number; resolve: (page: Page) => void }[] = []
    const fetchPage = (offset: number) => {
      offsets.push(offset)
      return new Promise<Page>((resolve) => pending.push({ offset, resolve }))
    }
    // Ответ «бэкенда» на самый старый запрос: total и записи страницы по offset.
    const reply = () => {
      const next = pending.shift()
      if (!next) throw new Error('нет запроса, на который отвечать')
      const count = Math.max(0, Math.min(10, total - next.offset))
      next.resolve({
        items: Array.from({ length: count }, (_, i) => `item-${next.offset + i + 1}`),
        total,
      })
    }

    const router = createMemoryRouter(
      [
        { path: '/', element: <p>главная</p> },
        { path: '/reviews', element: <ServerList fetchPage={fetchPage} /> },
      ],
      { initialEntries: ['/', '/reviews?page=99'], initialIndex: 1 },
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    // Пока total неизвестен — навигации нет: подсвечивать нечего.
    await waitFor(() => expect(offsets).toEqual([980]))
    expect(screen.queryByRole('navigation', { name: 'Страницы' })).not.toBeInTheDocument()

    reply()
    await waitFor(() => expect(router.state.location.search).toBe('?page=3'))
    // Замена, а не новая запись: адрес не врёт, «назад» уводит туда, откуда пришли.
    expect(router.state.historyAction).toBe('REPLACE')
    await waitFor(() => expect(offsets).toEqual([980, 20]))

    reply()
    expect(await screen.findByText('item-25')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('aria-current', 'page')
    // Ключ запроса не качается: ровно два запроса.
    expect(offsets).toEqual([980, 20])
  })
})
