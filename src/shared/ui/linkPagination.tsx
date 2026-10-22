import type { TablePaginationConfig } from 'antd'
import { isValidElement, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { UrlPagination } from '@/shared/lib'

type ItemType = Parameters<NonNullable<TablePaginationConfig['itemRender']>>[1]

const LABELS: Record<Exclude<ItemType, 'page'>, string> = {
  prev: 'Предыдущая страница',
  next: 'Следующая страница',
  'jump-prev': 'Назад на 5 страниц',
  'jump-next': 'Вперёд на 5 страниц',
}

/**
 * Настройки пагинации antd `Table` по `useUrlPagination`: номера страниц, «назад»,
 * «вперёд» и «…» — настоящие ссылки на тот же путь с другим `page`, поэтому работают средний
 * клик и «открыть в новой вкладке». Переход делает ссылка, `onChange` таблице не нужен.
 * Для серверной пагинации к результату добавляется `total` из ответа.
 */
export function linkPagination({
  page,
  pageSize,
  pageCount,
  toPage,
}: UrlPagination): TablePaginationConfig {
  return {
    current: page,
    pageSize,
    showSizeChanger: false,
    itemRender: (target, type, original) => {
      const inRange = target >= 1 && (pageCount === undefined || target <= pageCount)
      // Недоступные «назад»/«вперёд» на крайних страницах остаются кнопками antd.
      if (!inRange || (type !== 'page' && target === page)) return original
      if (type === 'page') {
        return (
          <Link to={toPage(target)} aria-current={target === page ? 'page' : undefined}>
            {target}
          </Link>
        )
      }
      const props = isValidElement<{ className?: string; children?: ReactNode }>(original)
        ? original.props
        : {}
      return (
        <Link to={toPage(target)} className={props.className} aria-label={LABELS[type]}>
          {props.children}
        </Link>
      )
    },
  }
}
