import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

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

/** Страница, ограниченная сверху числом страниц; пока оно неизвестно — как есть. */
export function clampPage(page: number, pageCount: number | undefined): number {
  return pageCount === undefined ? page : Math.min(page, pageCount)
}

/** Записи одной страницы — для таблиц, у которых список целиком на клиенте. */
export function pageSlice<T>(items: readonly T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize)
}

export interface UrlPage {
  /** Страница с единицы из `page`: проверенная, но сверху не ограниченная — число страниц хук не знает. */
  page: number
  /** Размер страницы: фиксированный, в URL не попадает. */
  pageSize: number
  /** Сдвиг первой записи страницы — `offset` для серверной пагинации, `limit` = `pageSize`. */
  offset: number
  /** Адрес той же страницы приложения с другим `page`; прочие query-параметры сохраняются. */
  toPage: (page: number) => string
}

/**
 * Страница из query-параметра `page`: ссылку на страницу можно отправить, «назад» и «вперёд»
 * браузера листают список. Некорректный `page` — первая страница. Хук не знает, сколько всего
 * записей, поэтому годится и для клиентской нарезки, и для запроса `limit/offset`: ключ
 * запроса зависит только от `offset`, а `total` из ответа передаётся в `useNormalizeUrlPage`.
 */
export function useUrlPage({ pageSize }: { pageSize: number }): UrlPage {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const page = parsePage(searchParams.get(PAGE_PARAM)) ?? 1

  const toPage = useCallback(
    (target: number) => {
      const params = new URLSearchParams(searchParams)
      // Первая страница — адрес без `page`: тот же, что и «по умолчанию».
      if (target <= 1) params.delete(PAGE_PARAM)
      else params.set(PAGE_PARAM, String(target))
      const search = params.toString()
      return search ? `${pathname}?${search}` : pathname
    },
    [pathname, searchParams],
  )

  return { page, pageSize, offset: (page - 1) * pageSize, toPage }
}

/**
 * Когда число страниц стало известно, а `page` в URL больше него, заменяет адрес на последнюю
 * страницу (`replace`, без новой записи в истории). Ссылка на «уехавшую» страницу — после
 * удаления записей или сужения поиска — ведёт к ближайшей существующей, а URL не врёт.
 *
 * `pageCount` — только из ответа для текущей страницы. С `placeholderData: keepPreviousData`
 * его передают лишь при `!isPlaceholderData`, иначе `undefined`: `total` предыдущей страницы
 * устарел, и по нему страница схлопнулась бы до прихода ответа.
 */
export function useNormalizeUrlPage(
  { page, toPage }: Pick<UrlPage, 'page' | 'toPage'>,
  pageCount: number | undefined,
): void {
  const navigate = useNavigate()
  useEffect(() => {
    if (pageCount !== undefined && page > pageCount) {
      void navigate(toPage(pageCount), { replace: true })
    }
  }, [navigate, page, pageCount, toPage])
}
