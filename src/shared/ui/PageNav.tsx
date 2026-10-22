import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { KeyboardEvent, ReactNode } from 'react'
import { useHref, useLinkClickHandler } from 'react-router-dom'

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
 * Space у ссылки по умолчанию прокручивает страницу; здесь — переход, как у кнопки, той же
 * логикой, что клик: на текущий адрес — `replace`, а не новая запись. Автоповтор при
 * удержании и Space с модификаторами не переходят.
 */
function onSpace(event: KeyboardEvent<HTMLAnchorElement>) {
  if (event.key !== ' ' || event.repeat) return
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return
  event.preventDefault()
  event.currentTarget.click()
}

interface PageLinkProps {
  to: string
  /** Недоступна: «назад» на первой странице, «вперёд» на последней. */
  disabled?: boolean
  current?: boolean
  label?: string
  children: ReactNode
}

/**
 * Пункт навигации — всегда `<a>`, и доступный, и недоступный: React сохраняет тот же DOM-узел,
 * когда «вперёд» становится недоступным на последней странице, и фокус остаётся на нём, а не
 * улетает на `body`. Недоступный пункт — без `href`, с `role="link"` и `aria-disabled`:
 * скринридер объявляет его недоступной ссылкой, Tab на нём останавливается, перехода нет.
 */
function PageLink({ to, disabled = false, current = false, label, children }: PageLinkProps) {
  const href = useHref(to)
  const handleClick = useLinkClickHandler<HTMLAnchorElement>(to)
  if (disabled) {
    return (
      <a role="link" aria-disabled="true" tabIndex={0} className="page-nav-link" aria-label={label}>
        {children}
      </a>
    )
  }
  return (
    <a
      href={href}
      className="page-nav-link"
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      onClick={handleClick}
      onKeyDown={onSpace}
    >
      {children}
    </a>
  )
}

/**
 * Навигация по страницам списка: каждый пункт — одна ссылка `<a href>` на тот же путь с
 * другим `page`. Отсюда одна остановка Tab на пункт, Enter и Space переходят, обычный клик —
 * одна запись в истории, средний клик и «открыть в новой вкладке» работают как у любой ссылки.
 * Одна страница — навигация не нужна и не рисуется.
 */
export function PageNav({ page, pageCount, toPage }: PageNavProps) {
  if (pageCount <= 1) return null

  const arrow = (target: number, icon: ReactNode, label: string) => (
    <PageLink to={toPage(target)} disabled={target < 1 || target > pageCount} label={label}>
      {icon}
    </PageLink>
  )

  return (
    <nav aria-label="Страницы" className="page-nav">
      <ul>
        <li>{arrow(page - 1, <LeftOutlined aria-hidden />, 'Предыдущая страница')}</li>
        {visiblePages(page, pageCount).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} className="page-nav-gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>
              <PageLink to={toPage(n)} current={n === page}>
                {n}
              </PageLink>
            </li>
          ),
        )}
        <li>{arrow(page + 1, <RightOutlined aria-hidden />, 'Следующая страница')}</li>
      </ul>
    </nav>
  )
}
