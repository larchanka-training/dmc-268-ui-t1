import { useLocation, useSearchParams } from 'react-router-dom'

/** Query-параметр с номером страницы, с единицы. */
export const PAGE_PARAM = 'page'

/**
 * Номер страницы из query-параметра: целое число с единицы. Пусто, не число, ноль,
 * отрицательное, дробное или запредельно большое — `undefined`, то есть «по умолчанию».
 */
export function parsePage(raw: string | null): number | undefined {
  if (raw === null || !/^[1-9]\d*$/.test(raw)) return undefined
  const page = Number(raw)
  return Number.isSafeInteger(page) ? page : undefined
}

/** Число страниц; у пустого списка одна страница — пустая. */
export function pageCountOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

export interface UrlPaginationOptions {
  /** Размер страницы: фиксированный, в URL не попадает. */
  pageSize: number
  /**
   * Сколько всего записей. Для клиентской нарезки — длина списка, для серверной — `total`
   * из ответа. Пока неизвестно (первый запрос ещё идёт), не передаётся: тогда страница
   * берётся из URL как есть, без ограничения сверху.
   */
  total?: number
}

export interface UrlPagination {
  /** Текущая страница с единицы: из URL, проверенная и не больше числа страниц. */
  page: number
  pageSize: number
  /** Сдвиг первой записи страницы — `offset` для серверной пагинации, `limit` = `pageSize`. */
  offset: number
  /** Число страниц; `undefined`, пока `total` неизвестен. */
  pageCount: number | undefined
  /** Ссылка на ту же страницу приложения с другим `page`; прочие query-параметры сохраняются. */
  toPage: (page: number) => string
}

/**
 * Пагинация, у которой источник правды — query-параметр `page`: ссылку на страницу можно
 * отправить, «назад» и «вперёд» браузера листают таблицу. Некорректный `page` даёт первую
 * страницу, слишком большой — последнюю. Сам ничего не нарезает: подходит и для клиентской
 * таблицы, и для запроса `limit/offset`.
 */
export function useUrlPagination({ pageSize, total }: UrlPaginationOptions): UrlPagination {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()

  const requested = parsePage(searchParams.get(PAGE_PARAM)) ?? 1
  const pageCount = total === undefined ? undefined : pageCountOf(total, pageSize)
  const page = pageCount === undefined ? requested : Math.min(requested, pageCount)

  const toPage = (target: number) => {
    const params = new URLSearchParams(searchParams)
    // Первая страница — адрес без `page`: тот же, что и «по умолчанию».
    if (target <= 1) params.delete(PAGE_PARAM)
    else params.set(PAGE_PARAM, String(target))
    const search = params.toString()
    return search ? `${pathname}?${search}` : pathname
  }

  return { page, pageSize, offset: (page - 1) * pageSize, pageCount, toPage }
}
