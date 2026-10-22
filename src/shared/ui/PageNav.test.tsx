import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { useUrlPage } from '@/shared/lib'
import { PageNav } from './PageNav'

function List({ pageCount }: { pageCount: number }) {
  const { page, toPage } = useUrlPage({ pageSize: 10 })
  return (
    <>
      <button type="button">до навигации</button>
      <PageNav page={page} pageCount={pageCount} toPage={toPage} />
    </>
  )
}

function renderAt(url: string, pageCount = 5) {
  const router = createMemoryRouter([{ path: '/list', element: <List pageCount={pageCount} /> }], {
    initialEntries: [url],
  })
  render(<RouterProvider router={router} />)
  return router
}

const nav = () => screen.getByRole('navigation', { name: 'Страницы' })

describe('PageNav', () => {
  it('каждый пункт — одна ссылка и одна остановка Tab', () => {
    renderAt('/list?page=2&q=x')

    for (const item of within(nav()).getAllByRole('listitem')) {
      const focusable = item.querySelectorAll('a[href], button, [tabindex]')
      expect(focusable.length).toBeLessThanOrEqual(1)
    }
    expect(within(nav()).getByRole('link', { name: '3' })).toHaveAttribute(
      'href',
      '/list?page=3&q=x',
    )
    expect(within(nav()).getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page')
  })

  it('Tab до номера и Enter — переход', async () => {
    const user = userEvent.setup()
    const router = renderAt('/list')

    await user.click(screen.getByRole('button', { name: 'до навигации' }))
    // «Назад» на первой странице недоступно и не фокусируется: первая остановка — «1».
    await user.tab()
    expect(within(nav()).getByRole('link', { name: '1' })).toHaveFocus()
    await user.tab()
    expect(within(nav()).getByRole('link', { name: '2' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(router.state.location.search).toBe('?page=2')
    expect(within(nav()).getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page')
  })

  it('Space на ссылке — тоже переход', async () => {
    const user = userEvent.setup()
    const router = renderAt('/list')

    within(nav()).getByRole('link', { name: 'Следующая страница' }).focus()
    await user.keyboard(' ')

    expect(router.state.location.search).toBe('?page=2')
  })

  it('клик — одна запись в истории; клик с Ctrl оставлен браузеру', async () => {
    const router = renderAt('/list')

    fireEvent.click(within(nav()).getByRole('link', { name: '3' }))
    expect(router.state.location.search).toBe('?page=3')
    expect(router.state.historyAction).toBe('PUSH')

    const notPrevented = fireEvent.click(within(nav()).getByRole('link', { name: '4' }), {
      ctrlKey: true,
    })
    // Ctrl-клик не перехвачен роутером: браузер откроет ссылку в новой вкладке.
    expect(notPrevented).toBe(true)
    expect(router.state.location.search).toBe('?page=3')

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('')
  })

  it('много страниц — первая, последняя, соседи текущей и пропуски', () => {
    renderAt('/list?page=10', 20)

    expect(
      within(nav())
        .getAllByRole('link')
        .map((a) => a.getAttribute('aria-label') ?? a.textContent),
    ).toEqual(['Предыдущая страница', '1', '8', '9', '10', '11', '12', '20', 'Следующая страница'])
  })

  it('одна страница — навигации нет', () => {
    renderAt('/list', 1)

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
