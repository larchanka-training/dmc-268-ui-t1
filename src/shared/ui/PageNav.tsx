import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { KeyboardEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export interface PageNavProps {
  /** Текущая страница с единицы, уже не больше `pageCount`. */
  page: number
  pageCount: number
  /** Адрес страницы — `toPage` из `useUrlPage`. */
  toPage: (page: number) => string
}

/** Сколько номеров показывать по обе стороны от текущего. */
const AROUND = 2

/** Номера страниц: первая, последняя и соседи текущей; `null` — пропуск «…». */
function visiblePages(page: number, pageCount: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let n = 1; n <= pageCount; n += 1) {
    if (n === 1 || n === pageCount || Math.abs(n - page) <= AROUND) result.push(n)
    else if (result[result.length - 1] !== null) result.push(null)
  }
  return result
}

/**
 * Навигация по страницам списка: каждый пункт — одна ссылка `<a href>` на тот же путь с
 * другим `page`. Отсюда одна остановка Tab на пункт, Enter (и Space) переходит, обычный клик —
 * одна запись в истории, средний клик и «открыть в новой вкладке» работают как у любой ссылки.
 * Одна страница — навигация не нужна и не рисуется.
 */
export function PageNav({ page, pageCount, toPage }: PageNavProps) {
  const navigate = useNavigate()
  if (pageCount <= 1) return null

  // Space у ссылки по умолчанию прокручивает страницу; здесь — переход, как у кнопки.
  const onKeyDown = (to: string) => (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === ' ') {
      event.preventDefault()
      void navigate(to)
    }
  }

  const item = (target: number, children: ReactNode, label?: string) => {
    const to = toPage(target)
    return (
      <Link
        to={to}
        className="page-nav-link"
        aria-label={label}
        aria-current={!label && target === page ? 'page' : undefined}
        onKeyDown={onKeyDown(to)}
      >
        {children}
      </Link>
    )
  }

  const arrow = (target: number, icon: ReactNode, label: string) =>
    target >= 1 && target <= pageCount ? (
      item(target, icon, label)
    ) : (
      <span className="page-nav-link" aria-disabled="true" aria-label={label}>
        {icon}
      </span>
    )

  return (
    <nav aria-label="Страницы" className="page-nav">
      <ul>
        <li>{arrow(page - 1, <LeftOutlined />, 'Предыдущая страница')}</li>
        {visiblePages(page, pageCount).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} className="page-nav-gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>{item(n, n)}</li>
          ),
        )}
        <li>{arrow(page + 1, <RightOutlined />, 'Следующая страница')}</li>
      </ul>
    </nav>
  )
}
